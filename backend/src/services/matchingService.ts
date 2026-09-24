import { AppError } from '../middleware/errorHandler';
import { getSocketServer } from '../sockets/chatSocket';
import { toPublicProfile } from '../mappers/profileMapper';
import { toMessage } from '../mappers/messageMapper';
import { InteractionRepository } from '../repositories/interactionRepository';
import { MatchRepository } from '../repositories/matchRepository';
import { MessageRepository } from '../repositories/messageRepository';
import { ProfileRepository } from '../repositories/profileRepository';
import { InterestRepository } from '../repositories/interestRepository';
import { assertInteractable } from './userGuards';
import { PresenceService } from './presenceService';
import { PhotoRepository } from '../repositories/photoRepository';
import { publicPhotos } from '../mappers/profileMapper';
import { UserLocationService } from './location/geolocation.service';
import { distanceBucketKm, haversineKm } from './location/distance.service';

/** Matches this recent without a message yet count as "New". */
const NEW_MATCH_DAYS = 7;

/** Bucketed distances from the viewer to each member (never exact); absent when either has no area. */
async function distancesFrom(viewerId: string, userIds: string[]): Promise<Map<string, number>> {
  const origin = await UserLocationService.originFor(viewerId);
  const result = new Map<string, number>();
  if (!origin) return result;
  const others = await Promise.all(userIds.map((id) => UserLocationService.originFor(id)));
  others.forEach((point, i) => {
    if (point) result.set(userIds[i], distanceBucketKm(haversineKm(origin, point)));
  });
  return result;
}
import { PushService } from './pushService';

export class MatchingService {
  static async recordLike(likerId: string, likeeId: string) {
    if (likerId === likeeId) {
      throw new AppError('Cannot like yourself', 400);
    }
    await assertInteractable(likerId, likeeId);
    await InteractionRepository.like(likerId, likeeId);

    // Each side's like is committed before it checks for the other's, so of two simultaneous
    // likes at least one sees the reciprocal; MatchRepository.ensure makes both succeed without duplicates.
    if (!(await InteractionRepository.hasLiked(likeeId, likerId))) {
      return { matched: false };
    }

    const conversationId = await MatchRepository.ensure(likerId, likeeId);
    const profiles = await ProfileRepository.findByUserIds([likerId, likeeId]);

    const liker = toPublicProfile(likerId, profiles.get(likerId));
    getSocketServer()
      ?.to(`user:${likeeId}`)
      .emit('new_match', {
        conversationId,
        matchedUser: { id: liker.id, displayName: liker.displayName, age: liker.age, avatarUrl: liker.avatarUrl },
      });
    void PushService.notifyIfAway(likeeId, {
      title: 'Unmute',
      body: 'You have a new match. Say hello!',
      url: `/chat/${conversationId}`,
      tag: `match:${conversationId}`,
    });

    const { isVerified: _isVerified, ...matchedUser } = toPublicProfile(likeeId, profiles.get(likeeId));
    return { matched: true, conversationId, matchedUser };
  }

  static async recordPass(passerId: string, passeeId: string) {
    if (passerId === passeeId) {
      throw new AppError('Cannot pass on yourself', 400);
    }
    await assertInteractable(passerId, passeeId);
    await InteractionRepository.pass(passerId, passeeId);
    return { success: true };
  }

  static async getMatches(currentUserId: string) {
    const matches = await MatchRepository.listForUser(currentUserId);
    const otherIds = matches.map((m) => m.other_user_id);
    const [profiles, interests, lastMessages, presence, distances] = await Promise.all([
      ProfileRepository.findByUserIds(otherIds),
      InterestRepository.forUsers(otherIds),
      MessageRepository.latestFor(matches.map((m) => m.conversation_id)),
      PresenceService.forUsers(otherIds),
      distancesFrom(currentUserId, otherIds),
    ]);
    const newSince = Date.now() - NEW_MATCH_DAYS * 24 * 60 * 60 * 1000;

    return matches.map((m) => {
      const lastMessage = lastMessages.get(m.conversation_id);
      return {
        // New: matched in the last week and nobody has written yet.
        isNew: !lastMessage && new Date(m.created_at).getTime() > newSince,
        matchId: m.match_id,
        conversationId: m.conversation_id,
        createdAt: m.created_at,
        lastMessageAt: m.last_message_at,
        lastMessage: lastMessage ? toMessage(lastMessage) : null,
        user: {
          ...toPublicProfile(m.other_user_id, profiles.get(m.other_user_id)),
          interests: (interests.get(m.other_user_id) ?? []).map((i) => i.name),
          presence: presence.get(m.other_user_id) ?? null,
          distanceKm: distances.get(m.other_user_id) ?? null,
        },
      };
    });
  }

  /**
   * People who liked you and are waiting for your answer (you have neither liked nor passed them),
   * newest first. Liking one back makes a match.
   */
  static async getIncomingLikes(currentUserId: string) {
    const likes = await InteractionRepository.incomingLikes(currentUserId);
    const ids = likes.map((l) => l.liker_id);
    const [profiles, photos, presence, distances] = await Promise.all([
      ProfileRepository.findByUserIds(ids),
      PhotoRepository.forUsers(ids),
      PresenceService.forUsers(ids),
      distancesFrom(currentUserId, ids),
    ]);
    return likes.map((l) => {
      const profile = profiles.get(l.liker_id);
      return {
        likedAt: l.created_at,
        user: {
          ...toPublicProfile(l.liker_id, profile),
          photos: publicPhotos(profile?.avatar_url, photos.get(l.liker_id)),
          presence: presence.get(l.liker_id) ?? null,
          distanceKm: distances.get(l.liker_id) ?? null,
        },
      };
    });
  }
}
