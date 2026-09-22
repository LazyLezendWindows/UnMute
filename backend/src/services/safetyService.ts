import crypto from 'crypto';
import { getDatabase } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { calculateAge } from '../utils/age';
import { ReportCategory } from '../config/constants';

export class SafetyService {
  static async blockUser(blockerId: string, blockedId: string, reason = '') {
    if (blockerId === blockedId) {
      throw new AppError('Cannot block yourself', 400);
    }

    const db = getDatabase();
    const now = new Date().toISOString();

    const existing = await db.get(
      'SELECT id FROM blocks WHERE blocker_id = $1 AND blocked_id = $2',
      [blockerId, blockedId]
    );

    if (!existing) {
      const blockId = crypto.randomUUID();
      await db.run(
        'INSERT INTO blocks (id, blocker_id, blocked_id, reason, created_at) VALUES ($1, $2, $3, $4, $5)',
        [blockId, blockerId, blockedId, reason, now]
      );
    }

    return { success: true, message: 'User has been blocked' };
  }

  static async unblockUser(blockerId: string, blockedId: string) {
    const db = getDatabase();
    await db.run(
      'DELETE FROM blocks WHERE blocker_id = $1 AND blocked_id = $2',
      [blockerId, blockedId]
    );
    return { success: true, message: 'User unblocked' };
  }

  static async getBlockedUsers(blockerId: string) {
    const db = getDatabase();
    const blocks = await db.query(
      `SELECT b.id, b.blocked_id, b.reason, b.created_at,
              p.display_name, p.date_of_birth, p.avatar_url
       FROM blocks b
       JOIN profiles p ON p.user_id = b.blocked_id
       WHERE b.blocker_id = $1
       ORDER BY b.created_at DESC`,
      [blockerId]
    );

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

  static async reportUser(
    reporterId: string,
    reportedId: string,
    category: ReportCategory,
    details = ''
  ) {
    if (reporterId === reportedId) {
      throw new AppError('Cannot report yourself', 400);
    }

    const db = getDatabase();
    const now = new Date().toISOString();
    const reportId = crypto.randomUUID();

    await db.run(
      `INSERT INTO reports (id, reporter_id, reported_id, reason_category, details, status, created_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', $6)`,
      [reportId, reporterId, reportedId, category, details, now]
    );

    return {
      success: true,
      message: 'Report submitted. Our safety team will review this.',
    };
  }
}
