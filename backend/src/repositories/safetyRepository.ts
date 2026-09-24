import crypto from 'crypto';
import { getDatabase } from '../config/database';
import { ProfileRow } from '../mappers/profileMapper';
import { dbTimestamp } from '../utils/time';

export class SafetyRepository {
  static async isBlockedBetween(userX: string, userY: string): Promise<boolean> {
    return Boolean(
      await getDatabase().get(
        'SELECT id FROM blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)',
        [userX, userY, userY, userX]
      )
    );
  }

  /** Idempotent: blocking twice keeps the original block (unique (blocker_id, blocked_id)). */
  static async block(blockerId: string, blockedId: string, reason: string): Promise<void> {
    await getDatabase().run(
      `INSERT INTO blocks (id, blocker_id, blocked_id, reason, created_at) VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE id = id`,
      [crypto.randomUUID(), blockerId, blockedId, reason, dbTimestamp()]
    );
  }

  static async unblock(blockerId: string, blockedId: string): Promise<void> {
    await getDatabase().run('DELETE FROM blocks WHERE blocker_id = ? AND blocked_id = ?', [blockerId, blockedId]);
  }

  static listBlockedBy(
    blockerId: string
  ): Promise<(Pick<ProfileRow, 'display_name' | 'date_of_birth' | 'avatar_url'> & { id: string; blocked_id: string; reason: string; created_at: string })[]> {
    return getDatabase().query(
      `SELECT b.id, b.blocked_id, b.reason, b.created_at, p.display_name, p.date_of_birth, p.avatar_url
       FROM blocks b
       JOIN profiles p ON p.user_id = b.blocked_id
       WHERE b.blocker_id = ?
       ORDER BY b.created_at DESC`,
      [blockerId]
    );
  }

  /** An open (pending) report by the same member about the same member, filed recently. */
  static findRecentPendingReport(reporterId: string, reportedId: string, since: string): Promise<{ id: string } | null> {
    return getDatabase().get(
      `SELECT id FROM reports
       WHERE reporter_id = ? AND reported_id = ? AND status = 'pending' AND created_at >= ?
       ORDER BY created_at DESC LIMIT 1`,
      [reporterId, reportedId, since]
    );
  }

  static async insertReport(report: {
    reporterId: string;
    reportedId: string;
    category: string;
    details: string;
    conversationId: string | null;
    evidence: string;
  }): Promise<string> {
    const id = crypto.randomUUID();
    await getDatabase().run(
      `INSERT INTO reports (id, reporter_id, reported_id, reason_category, details, status, conversation_id, evidence, created_at)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
      [id, report.reporterId, report.reportedId, report.category, report.details, report.conversationId, report.evidence, dbTimestamp()]
    );
    return id;
  }
}
