import crypto from 'crypto';
import { getDatabase } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { calculateAge } from '../utils/age';
import { getSocketServer } from '../sockets/chatSocket';

export class ChatService {
  static async getConversations(userId: string) {
    const db = getDatabase();

    const conversations = await db.query(
      `SELECT
         c.id,
         c.match_id,
         c.user_a_id,
         c.user_b_id,
         c.last_message_at,
         c.created_at,
         CASE WHEN c.user_a_id = $1 THEN c.user_b_id ELSE c.user_a_id END as other_user_id
       FROM conversations c
       WHERE (c.user_a_id = $1 OR c.user_b_id = $1)
         AND c.user_a_id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = $1 UNION SELECT blocker_id FROM blocks WHERE blocked_id = $1)
         AND c.user_b_id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = $1 UNION SELECT blocker_id FROM blocks WHERE blocked_id = $1)
       ORDER BY COALESCE(c.last_message_at, c.created_at) DESC`,
      [userId]
    );

    return Promise.all(
      conversations.map(async (conv) => {
        const otherProfile = await db.get(
          `SELECT p.display_name, p.date_of_birth, p.avatar_url, p.is_verified, p.approximate_location
           FROM profiles p WHERE p.user_id = $1`,
          [conv.other_user_id]
        );

        const lastMessage = await db.get(
          `SELECT id, sender_id, content, status, created_at
           FROM messages WHERE conversation_id = $1
           ORDER BY created_at DESC LIMIT 1`,
          [conv.id]
        );

        const unreadRes = await db.get(
          `SELECT COUNT(*) as count
           FROM messages
           WHERE conversation_id = $1 AND sender_id != $2 AND status != 'read'`,
          [conv.id, userId]
        );

        return {
          id: conv.id,
          matchId: conv.match_id,
          lastMessageAt: conv.last_message_at,
          lastMessage: lastMessage || null,
          unreadCount: parseInt(unreadRes?.count || '0', 10),
          otherUser: {
            id: conv.other_user_id,
            displayName: otherProfile?.display_name || 'Connection',
            age: otherProfile ? calculateAge(otherProfile.date_of_birth) : 18,
            avatarUrl: otherProfile?.avatar_url || '',
            approximateLocation: otherProfile?.approximate_location || '',
            isVerified: Boolean(otherProfile?.is_verified),
          },
        };
      })
    );
  }

  static async getMessages(conversationId: string, userId: string, limit = 50, offset = 0) {
    const db = getDatabase();

    const conv = await db.get(
      'SELECT id, user_a_id, user_b_id FROM conversations WHERE id = $1',
      [conversationId]
    );

    if (!conv || (conv.user_a_id !== userId && conv.user_b_id !== userId)) {
      throw new AppError('Conversation not found or unauthorized', 404);
    }

    const otherUserId = conv.user_a_id === userId ? conv.user_b_id : conv.user_a_id;

    // Check block
    const isBlocked = await db.get(
      'SELECT id FROM blocks WHERE (blocker_id = $1 AND blocked_id = $2) OR (blocker_id = $2 AND blocked_id = $1)',
      [userId, otherUserId]
    );
    if (isBlocked) {
      throw new AppError('Access to this conversation is restricted', 403);
    }

    const messages = await db.query(
      `SELECT id, conversation_id, sender_id, content, status, created_at
       FROM messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC
       LIMIT $2 OFFSET $3`,
      [conversationId, limit, offset]
    );

    // Auto mark received messages as read
    await db.run(
      `UPDATE messages SET status = 'read'
       WHERE conversation_id = $1 AND sender_id != $2 AND status != 'read'`,
      [conversationId, userId]
    );

    // Notify other user that their messages were read
    const io = getSocketServer();
    if (io) {
      io.to(`conversation:${conversationId}`).emit('messages_read', {
        conversationId,
        readerId: userId,
      });
    }

    const otherProfile = await db.get(
      `SELECT p.display_name, p.date_of_birth, p.avatar_url, p.is_verified, p.bio, p.approximate_location
       FROM profiles p WHERE p.user_id = $1`,
      [otherUserId]
    );

    const otherInterests = await db.query(
      `SELECT i.name FROM user_interests ui
       JOIN interests i ON ui.interest_id = i.id
       WHERE ui.user_id = $1`,
      [otherUserId]
    );

    return {
      conversationId,
      otherUser: {
        id: otherUserId,
        displayName: otherProfile?.display_name || 'Connection',
        age: otherProfile ? calculateAge(otherProfile.date_of_birth) : 18,
        avatarUrl: otherProfile?.avatar_url || '',
        bio: otherProfile?.bio || '',
        approximateLocation: otherProfile?.approximate_location || '',
        isVerified: Boolean(otherProfile?.is_verified),
        interests: otherInterests.map((i) => i.name),
      },
      messages,
    };
  }

  static async sendMessage(conversationId: string, senderId: string, content: string) {
    const db = getDatabase();

    const conv = await db.get(
      'SELECT id, user_a_id, user_b_id FROM conversations WHERE id = $1',
      [conversationId]
    );

    if (!conv || (conv.user_a_id !== senderId && conv.user_b_id !== senderId)) {
      throw new AppError('Conversation not found or unauthorized', 404);
    }

    const recipientId = conv.user_a_id === senderId ? conv.user_b_id : conv.user_a_id;

    // Check if blocked in either direction
    const isBlocked = await db.get(
      'SELECT id FROM blocks WHERE (blocker_id = $1 AND blocked_id = $2) OR (blocker_id = $2 AND blocked_id = $1)',
      [senderId, recipientId]
    );
    if (isBlocked) {
      throw new AppError('You cannot message this user', 403);
    }

    const messageId = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.run(
      `INSERT INTO messages (id, conversation_id, sender_id, content, status, created_at)
       VALUES ($1, $2, $3, $4, 'sent', $5)`,
      [messageId, conversationId, senderId, content, now]
    );

    await db.run(
      'UPDATE conversations SET last_message_at = $1 WHERE id = $2',
      [now, conversationId]
    );

    const message = {
      id: messageId,
      conversationId,
      senderId,
      content,
      status: 'sent',
      createdAt: now,
    };

    // Emit real-time message to conversation room and recipient user room
    const io = getSocketServer();
    if (io) {
      io.to(`conversation:${conversationId}`).emit('new_message', message);
      io.to(`user:${recipientId}`).emit('message_notification', {
        conversationId,
        message,
      });
    }

    return message;
  }
}
