import crypto from 'crypto';
import { getDatabase, IDatabase } from '../config/database';

export type ReportStatus = 'pending' | 'reviewed' | 'resolved' | 'rejected';
export type ModerationAction = 'review' | 'resolve' | 'reject' | 'suspend' | 'unsuspend';

export interface ReportRow {
  id: string;
  reporter_id: string | null;
  reported_id: string | null;
  reason_category: string;
  details: string | null;
  status: ReportStatus;
  conversation_id: string | null;
  evidence: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  resolution_note: string | null;
  created_at: string;
  reporter_name: string | null;
  reported_name: string | null;
  reported_status: string | null;
  reported_open_reports: number;
}

const REPORT_SELECT = `SELECT r.id, r.reporter_id, r.reported_id, r.reason_category, r.details, r.status,
    r.conversation_id, r.evidence, r.reviewed_by, r.reviewed_at, r.resolution_note, r.created_at,
    rp.display_name AS reporter_name, dp.display_name AS reported_name, du.status AS reported_status,
    (SELECT COUNT(*) FROM reports o WHERE o.reported_id = r.reported_id AND o.status = 'pending') AS reported_open_reports
  FROM reports r
  LEFT JOIN profiles rp ON rp.user_id = r.reporter_id
  LEFT JOIN profiles dp ON dp.user_id = r.reported_id
  LEFT JOIN users du ON du.id = r.reported_id`;

export class ModerationRepository {
  static listReports(status: ReportStatus, limit: number, offset: number): Promise<ReportRow[]> {
    return getDatabase().query(`${REPORT_SELECT} WHERE r.status = ? ORDER BY r.created_at ASC, r.id LIMIT ? OFFSET ?`, [
      status,
      limit,
      offset,
    ]);
  }

  static findReport(id: string): Promise<ReportRow | null> {
    return getDatabase().get(`${REPORT_SELECT} WHERE r.id = ?`, [id]);
  }

  static async setReportDecision(db: IDatabase, id: string, status: ReportStatus, moderatorId: string, note: string) {
    await db.run(
      'UPDATE reports SET status = ?, reviewed_by = ?, reviewed_at = UTC_TIMESTAMP(), resolution_note = ? WHERE id = ?',
      [status, moderatorId, note, id]
    );
  }

  static async recordAction(
    db: IDatabase,
    action: { moderatorId: string; action: ModerationAction; targetUserId?: string | null; reportId?: string | null; note: string }
  ): Promise<void> {
    await db.run(
      `INSERT INTO moderation_actions (id, moderator_id, target_user_id, report_id, action, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
      [crypto.randomUUID(), action.moderatorId, action.targetUserId ?? null, action.reportId ?? null, action.action, action.note]
    );
  }

  static actionsFor(targetUserId: string) {
    return getDatabase().query<{ action: ModerationAction; note: string | null; created_at: string; moderator_id: string | null; report_id: string | null }>(
      `SELECT action, note, created_at, moderator_id, report_id FROM moderation_actions
       WHERE target_user_id = ? ORDER BY created_at DESC LIMIT 100`,
      [targetUserId]
    );
  }
}
