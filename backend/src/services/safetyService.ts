import { AppError } from '../middleware/errorHandler';
import { calculateAge } from '../utils/age';
import { ReportCategory } from '../config/constants';
import { getSocketServer } from '../sockets/chatSocket';
import { SafetyRepository } from '../repositories/safetyRepository';
import { ConversationRepository } from '../repositories/conversationRepository';
import { assertUserExists } from './userGuards';

/**
 * A block ends realtime delivery immediately: both users' live sockets leave every conversation
 * room they share, so nothing already subscribed keeps flowing (REST sends are refused separately).
 */
async function evictFromSharedConversations(userX: string, userY: string): Promise<void> {
  const io = getSocketServer();
  if (!io) return;
  for (const id of await ConversationRepository.idsBetween(userX, userY)) {
    io.in([`user:${userX}`, `user:${userY}`]).socketsLeave(`conversation:${id}`);
  }
}

export class SafetyService {
  static async blockUser(blockerId: string, blockedId: string, reason = '') {
    if (blockerId === blockedId) {
      throw new AppError('Cannot block yourself', 400);
    }
    await assertUserExists(blockedId);
    await SafetyRepository.block(blockerId, blockedId, reason);
    await evictFromSharedConversations(blockerId, blockedId);
    return { success: true, message: 'User has been blocked' };
  }

  static async unblockUser(blockerId: string, blockedId: string) {
    await SafetyRepository.unblock(blockerId, blockedId);
    return { success: true, message: 'User unblocked' };
  }

  static async getBlockedUsers(blockerId: string) {
    const blocks = await SafetyRepository.listBlockedBy(blockerId);
    return blocks.map((b) => ({
      id: b.id,
      blockedId: b.blocked_id,
      reason: b.reason,
      createdAt: b.created_at,
      displayName: b.display_name,
      age: calculateAge(b.date_of_birth),
      avatarUrl: b.avatar_url,
    }));
  }

  static async reportUser(reporterId: string, reportedId: string, category: ReportCategory, details = '') {
    if (reporterId === reportedId) {
      throw new AppError('Cannot report yourself', 400);
    }
    await assertUserExists(reportedId);
    const reportId = await SafetyRepository.insertReport({ reporterId, reportedId, category, details });
    console.info(`[Safety] Report ${reportId} filed (${category})`);
    return { success: true, message: 'Report submitted. Our safety team will review this.' };
  }
}
