import { AppError } from '../middleware/errorHandler';
import { getSocketServer } from '../sockets/chatSocket';
import { toPublicProfile } from '../mappers/profileMapper';
import { toMessage } from '../mappers/messageMapper';
import { ConversationRepository } from '../repositories/conversationRepository';
import { MessageRepository } from '../repositories/messageRepository';
import { ProfileRepository } from '../repositories/profileRepository';
import { InterestRepository } from '../repositories/interestRepository';
import { PushService } from './pushService';
import { PresenceService } from './presenceService';
import { PhotoService, UploadReceipt, chatPhotoUrl } from './photoService';
import { chatPhotoFolder } from '../utils/avatar';

export class ChatService {
  static async getConversations(userId: string) {
    const conversations = await ConversationRepository.listForUser(userId);
    const ids = conversations.map((c) => c.id);
    const otherIds = conversations.map((c) => c.other_user_id);
    const [profiles, lastMessages, unread, presence] = await Promise.all([
      ProfileRepository.findByUserIds(otherIds),
      MessageRepository.latestFor(ids),
      MessageRepository.unreadCounts(ids, userId),
      PresenceService.forUsers(otherIds),
    ]);

    return conversations.map((conv) => {
      const lastMessage = lastMessages.get(conv.id);
      const { bio: _bio, ...otherUser } = toPublicProfile(conv.other_user_id, profiles.get(conv.other_user_id));
      return {
        id: conv.id,
        matchId: conv.match_id,
        lastMessageAt: conv.last_message_at,
        lastMessage: lastMessage ? toMessage(lastMessage) : null,
        unreadCount: unread.get(conv.id) ?? 0,
        otherUser: { ...otherUser, presence: presence.get(conv.other_user_id) ?? null },
      };
    });
  }

  /** True if `userId` belongs to the conversation and neither participant has blocked the other. */
  static async canAccessConversation(conversationId: string, userId: string): Promise<boolean> {
    const conv = await ConversationRepository.findForParticipant(conversationId, userId);
    return Boolean(conv && !conv.blocked && conv.status === 'accepted');
  }

  /** Resolves a conversation the user may use, or fails without revealing whether it exists. */
  private static async requireAccessible(conversationId: string, userId: string, blockedMessage: string) {
    const conv = await ConversationRepository.findForParticipant(conversationId, userId);
    if (!conv) {
      throw new AppError('Conversation not found or unauthorized', 404);
    }
    if (conv.blocked) {
      throw new AppError(blockedMessage, 403);
    }
    // Only approved chats can be read or written; a request is handled by ChatRequestService.
    if (conv.status !== 'accepted') {
      if (conv.status === 'pending' || (conv.status === 'declined' && conv.requester_id === userId)) {
        throw new AppError(
          conv.requester_id === userId
            ? "Your message request hasn't been accepted yet."
            : 'Accept the message request to reply.',
          403,
          'REQUEST_NOT_ACCEPTED'
        );
      }
      throw new AppError('Conversation not found or unauthorized', 404);
    }
    return conv;
  }

  static async getMessages(conversationId: string, userId: string, limit = 50, before?: string) {
    const conv = await this.requireAccessible(conversationId, userId, 'Access to this conversation is restricted');

    const [{ rows, hasMore }, profile, interests, presence] = await Promise.all([
      MessageRepository.page(conversationId, limit, before),
      ProfileRepository.findByUserId(conv.other_user_id),
      InterestRepository.forUser(conv.other_user_id),
      PresenceService.forUsers([conv.other_user_id]),
    ]);

    await MessageRepository.markRead(conversationId, userId);
    getSocketServer()?.to(`conversation:${conversationId}`).emit('messages_read', { conversationId, readerId: userId });

    return {
      conversationId,
      otherUser: {
        ...toPublicProfile(conv.other_user_id, profile),
        interests: interests.map((i) => i.name),
        presence: presence.get(conv.other_user_id) ?? null,
      },
      messages: rows.map(toMessage),
      hasMore,
    };
  }

  /** Permission to upload one photo into an approved chat (members only, never for a request). */
  static async createAttachmentUpload(conversationId: string, userId: string) {
    await this.requireAccessible(conversationId, userId, 'You cannot message this user');
    return PhotoService.signUpload(chatPhotoFolder(conversationId));
  }

  /** The sender is always the authenticated user; `created` is false for a repeated (retried) send. */
  static async sendMessage(
    conversationId: string,
    senderId: string,
    content: string,
    clientMessageId?: string,
    attachment?: UploadReceipt
  ) {
    const conv = await this.requireAccessible(conversationId, senderId, 'You cannot message this user');
    let attachmentUrl: string | null = null;
    if (attachment) {
      PhotoService.verifyUpload(chatPhotoFolder(conversationId), attachment);
      attachmentUrl = chatPhotoUrl(attachment.publicId, attachment.version);
    }

    const { row, created } = await MessageRepository.insert(conversationId, senderId, content, clientMessageId, undefined, attachmentUrl);
    const message = toMessage(row);
    if (!created) return { message, created };
    await ConversationRepository.touch(conversationId, message.createdAt);

    const io = getSocketServer();
    if (io) {
      io.to(`conversation:${conversationId}`).emit('new_message', message);
      io.to(`user:${conv.other_user_id}`).emit('message_notification', { conversationId, message });
    }
    // Deliberately generic: notifications show on lock screens, so they carry no name or message text.
    void PushService.notifyIfAway(conv.other_user_id, {
      title: 'Unmute',
      body: 'You have a new message',
      url: `/chat/${conversationId}`,
      tag: `conversation:${conversationId}`,
    });

    return { message, created };
  }
}
