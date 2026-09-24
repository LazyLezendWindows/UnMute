import { config } from '../config/env';
import { getDatabase } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { getSocketServer } from '../sockets/chatSocket';
import { parsePreferences, toPublicProfile } from '../mappers/profileMapper';
import { toMessage } from '../mappers/messageMapper';
import { ChatRequestRepository, PairRow, RequestSummaryRow } from '../repositories/chatRequestRepository';
import { ConversationRepository } from '../repositories/conversationRepository';
import { MessageRepository } from '../repositories/messageRepository';
import { ProfileRepository } from '../repositories/profileRepository';
import { InterestRepository } from '../repositories/interestRepository';
import { SafetyRepository } from '../repositories/safetyRepository';
import { UserRepository } from '../repositories/userRepository';
import { distanceBucketKm, haversineKm } from './location/distance.service';
import { UserLocationService } from './location/geolocation.service';
import { PushService } from './pushService';
import { dbTimestamp } from '../utils/time';

/** What the sender sees for any request they may not use (unknown, inactive or blocked member). */
const UNAVAILABLE = () => new AppError('User not found', 404);
const NOT_FOUND = () => new AppError('Request not found', 404);
/** Shown to a sender for a pending request and, identically, for a declined one within its cooldown. */
const ALREADY_SENT = (conversationId: string) =>
  new AppError('You already sent this person a message request.', 409, 'REQUEST_PENDING', { conversationId });

const PREVIEW_LENGTH = 140;

function cooldownStart(): string {
  return dbTimestamp(new Date(Date.now() - config.chatRequests.declineCooldownDays * 24 * 60 * 60 * 1000));
}

function withinCooldown(row: PairRow): boolean {
  return Boolean(row.declined_at && row.declined_at > new Date(Date.now() - config.chatRequests.declineCooldownDays * 86_400_000).toISOString());
}

/** Realtime events carry ids only; clients re-fetch from the API (the database is the source of truth). */
function emitTo(userId: string, event: string, payload: object) {
  getSocketServer()?.to(`user:${userId}`).emit(event, payload);
}

async function distanceBetween(userX: string, userY: string): Promise<number | null> {
  const [a, b] = await Promise.all([UserLocationService.originFor(userX), UserLocationService.originFor(userY)]);
  return a && b ? distanceBucketKm(haversineKm(a, b)) : null;
}

export type CreateRequestResult =
  | { status: 'pending'; conversationId: string }
  /** `delivered`: whether the message was stored (false: an existing chat, send it there). */
  | { status: 'accepted'; conversationId: string; delivered: boolean };

export class ChatRequestService {
  /**
   * Sends a message to someone. With no chat between the two, it becomes a request carrying one
   * introductory message; the recipient decides. Everything is decided on the pair's locked row,
   * so concurrent calls (double taps, two devices, both members at once) cannot create duplicates.
   */
  static async create(senderId: string, recipientId: string, content: string, clientMessageId?: string): Promise<CreateRequestResult> {
    if (senderId === recipientId) throw UNAVAILABLE();
    // Unknown, inactive and blocked (either way) all look the same: nothing about the account leaks.
    if (!(await UserRepository.isActive(recipientId)) || (await SafetyRepository.isBlockedBetween(senderId, recipientId))) {
      throw UNAVAILABLE();
    }

    const outcome = await getDatabase().transaction(async (tx) => {
      const { row, created } = await ChatRequestRepository.lockPair(tx, senderId, recipientId);

      if (row.status === 'accepted') return { kind: 'existing-chat' as const, row };

      if (row.status === 'pending' && row.requester_id === recipientId) {
        // They asked us first: answering is accepting. One conversation, both messages in it.
        await ChatRequestRepository.setStatus(tx, row.id, 'accepted');
        await ChatRequestRepository.recordEvent(tx, row.id, senderId, 'accepted');
        const { row: message } = await MessageRepository.insert(row.id, senderId, content, clientMessageId, tx);
        return { kind: 'mutual' as const, row, message };
      }

      if (!created && row.requester_id === senderId && (row.status === 'pending' || withinCooldown(row))) {
        throw ALREADY_SENT(row.id);
      }

      if ((await ChatRequestRepository.countPendingSent(tx, senderId)) >= config.chatRequests.maxPending) {
        throw new AppError('You have many requests waiting for an answer. Wait for some replies before sending more.', 429, 'TOO_MANY_PENDING');
      }
      const dayAgo = dbTimestamp(new Date(Date.now() - 24 * 60 * 60 * 1000));
      if ((await ChatRequestRepository.countStartedSince(tx, senderId, dayAgo)) >= config.chatRequests.perDay) {
        throw new AppError("You've sent a lot of requests today. Try again tomorrow.", 429, 'REQUEST_LIMIT');
      }

      await ChatRequestRepository.startRequest(tx, row.id, senderId, recipientId);
      await ChatRequestRepository.recordEvent(tx, row.id, senderId, 'requested');
      await MessageRepository.insert(row.id, senderId, content, clientMessageId, tx);
      return { kind: 'requested' as const, row };
    });

    switch (outcome.kind) {
      case 'existing-chat':
        return { status: 'accepted', conversationId: outcome.row.id, delivered: false };

      case 'mutual': {
        const message = toMessage(outcome.message);
        await ConversationRepository.touch(outcome.row.id, message.createdAt);
        emitTo(recipientId, 'chat_request_accepted', { requestId: outcome.row.id, conversationId: outcome.row.id });
        emitTo(senderId, 'chat_request_accepted', { requestId: outcome.row.id, conversationId: outcome.row.id });
        void PushService.notifyIfAway(recipientId, {
          title: 'Unmute',
          body: 'Your message request was accepted',
          url: `/chat/${outcome.row.id}`,
          tag: `conversation:${outcome.row.id}`,
        });
        return { status: 'accepted', conversationId: outcome.row.id, delivered: true };
      }

      case 'requested':
        emitTo(recipientId, 'chat_request_received', { requestId: outcome.row.id });
        emitTo(senderId, 'chat_request_sent', { requestId: outcome.row.id });
        void PushService.notifyIfAway(recipientId, {
          title: 'Unmute',
          body: 'You have a new message request',
          url: '/chat?tab=requests',
          tag: `request:${outcome.row.id}`,
        });
        return { status: 'pending', conversationId: outcome.row.id };
    }
  }

  static async listIncoming(userId: string) {
    return this.summarise(userId, await ChatRequestRepository.listIncoming(userId), 'incoming');
  }

  static async listSent(userId: string) {
    return this.summarise(userId, await ChatRequestRepository.listSent(userId, cooldownStart()), 'sent');
  }

  private static async summarise(viewerId: string, rows: RequestSummaryRow[], direction: 'incoming' | 'sent') {
    const [profiles, intros, distances] = await Promise.all([
      ProfileRepository.findByUserIds(rows.map((r) => r.other_user_id)),
      ChatRequestRepository.introductions(rows.map((r) => r.id)),
      Promise.all(rows.map((r) => distanceBetween(viewerId, r.other_user_id))),
    ]);
    return rows.map((r, i) => {
      const { bio: _bio, education: _education, ...otherUser } = toPublicProfile(r.other_user_id, profiles.get(r.other_user_id));
      const intro = intros.get(r.id);
      return {
        id: r.id,
        direction,
        // A declined request still reads "pending" to its sender.
        status: 'pending' as const,
        requestedAt: r.requested_at,
        preview: intro ? intro.content.slice(0, PREVIEW_LENGTH) : '',
        otherUser: { ...otherUser, distanceKm: distances[i] },
      };
    });
  }

  /**
   * One request as its recipient (to decide) or its sender (to see or cancel) sees it. Viewing
   * never accepts it and never marks anything read. Closed requests are gone for good.
   */
  static async get(conversationId: string, userId: string) {
    const row = await ChatRequestRepository.findForMember(conversationId, userId);
    if (!row || !row.requester_id || !row.recipient_id) throw NOT_FOUND();
    const isRecipient = row.recipient_id === userId;
    const visible = isRecipient ? row.status === 'pending' : row.status === 'pending' || (row.status === 'declined' && withinCooldown(row));
    const otherId = isRecipient ? row.requester_id : row.recipient_id;
    if (!visible || (await SafetyRepository.isBlockedBetween(userId, otherId)) || !(await UserRepository.isActive(otherId))) {
      throw NOT_FOUND();
    }

    const [profile, interests, intros, distanceKm, myInterests] = await Promise.all([
      ProfileRepository.findByUserId(otherId),
      InterestRepository.forUser(otherId),
      ChatRequestRepository.introductions([row.id]),
      distanceBetween(userId, otherId),
      InterestRepository.forUser(userId),
    ]);
    const mine = new Set(myInterests.map((i) => i.id));
    const commonInterests = interests.filter((i) => mine.has(i.id)).map((i) => i.name);
    const intro = intros.get(row.id);
    return {
      id: row.id,
      direction: isRecipient ? 'incoming' : 'sent',
      status: 'pending' as const,
      requestedAt: row.requested_at,
      message: intro ? { content: intro.content, createdAt: intro.created_at, fromMe: !isRecipient } : null,
      otherUser: {
        ...toPublicProfile(otherId, profile),
        distanceKm,
        interactionPreferences: parsePreferences(profile?.interaction_preferences),
        interests,
        commonInterests,
        commonInterestsCount: commonInterests.length,
      },
    };
  }

  /** Recipient only. Accepting twice (double tap, two devices) is harmless and yields the same chat. */
  static async accept(conversationId: string, userId: string) {
    const row = await getDatabase().transaction(async (tx) => {
      const current = await ChatRequestRepository.lockForMember(tx, conversationId, userId);
      if (current?.status === 'accepted' && current.recipient_id === userId) return { ...current, alreadyAccepted: true };
      if (!current || current.status !== 'pending' || current.recipient_id !== userId) throw NOT_FOUND();
      if (await SafetyRepository.isBlockedBetween(current.requester_id!, userId)) throw NOT_FOUND();
      await ChatRequestRepository.setStatus(tx, current.id, 'accepted');
      await ChatRequestRepository.recordEvent(tx, current.id, userId, 'accepted');
      return { ...current, alreadyAccepted: false };
    });

    if (!row.alreadyAccepted) {
      emitTo(row.requester_id!, 'chat_request_accepted', { requestId: row.id, conversationId: row.id });
      emitTo(userId, 'chat_request_accepted', { requestId: row.id, conversationId: row.id });
      void PushService.notifyIfAway(row.requester_id!, {
        title: 'Unmute',
        body: 'Your message request was accepted',
        url: `/chat/${row.id}`,
        tag: `conversation:${row.id}`,
      });
    }
    return { conversationId: row.id };
  }

  /**
   * Recipient only: removes the request quietly. The sender is not told (their request keeps
   * reading "pending" until the cooldown ends) and cannot ask again until then.
   */
  static async decline(conversationId: string, userId: string) {
    const declined = await getDatabase().transaction(async (tx) => {
      const current = await ChatRequestRepository.lockForMember(tx, conversationId, userId);
      if (current?.status === 'declined' && current.recipient_id === userId) return false;
      if (!current || current.status !== 'pending' || current.recipient_id !== userId) throw NOT_FOUND();
      await ChatRequestRepository.setStatus(tx, current.id, 'declined', { declined: true });
      await ChatRequestRepository.recordEvent(tx, current.id, userId, 'declined');
      return true;
    });
    if (declined) emitTo(userId, 'chat_request_removed', { requestId: conversationId });
    return { declined: true };
  }

  /** Sender only: withdraws their request (a quietly declined one too, without lifting its cooldown). */
  static async cancel(conversationId: string, userId: string) {
    const { recipientId, wasVisible } = await getDatabase().transaction(async (tx) => {
      const current = await ChatRequestRepository.lockForMember(tx, conversationId, userId);
      if (current?.status === 'cancelled' && current.requester_id === userId) return { recipientId: null, wasVisible: false };
      const cancellable =
        current &&
        current.requester_id === userId &&
        (current.status === 'pending' || (current.status === 'declined' && withinCooldown(current)));
      if (!cancellable) throw NOT_FOUND();
      await ChatRequestRepository.setStatus(tx, current.id, 'cancelled');
      await ChatRequestRepository.recordEvent(tx, current.id, userId, 'cancelled');
      return { recipientId: current.recipient_id, wasVisible: current.status === 'pending' };
    });
    emitTo(userId, 'chat_request_removed', { requestId: conversationId });
    if (recipientId && wasVisible) emitTo(recipientId, 'chat_request_removed', { requestId: conversationId });
    return { cancelled: true };
  }
}
