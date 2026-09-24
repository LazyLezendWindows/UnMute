import { getDatabase, IDatabase } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { getSocketServer } from '../sockets/chatSocket';
import { UserRepository } from '../repositories/userRepository';
import { SessionRepository } from '../repositories/sessionRepository';
import { ModerationRepository, ReportRow, ReportStatus } from '../repositories/moderationRepository';

function parseEvidence(raw: string | null) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function toReport(row: ReportRow, withEvidence: boolean) {
  return {
    id: row.id,
    category: row.reason_category,
    details: row.details || '',
    status: row.status,
    createdAt: row.created_at,
    conversationId: row.conversation_id,
    // A null id means the account has since been deleted; the report itself is kept.
    reporter: { id: row.reporter_id, displayName: row.reporter_name },
    reported: {
      id: row.reported_id,
      displayName: row.reported_name,
      accountStatus: row.reported_status,
      openReports: Number(row.reported_open_reports),
    },
    review: row.reviewed_at ? { by: row.reviewed_by, at: row.reviewed_at, note: row.resolution_note || '' } : null,
    ...(withEvidence ? { evidence: parseEvidence(row.evidence) } : {}),
  };
}

/** Staff may act on members only: a moderator cannot suspend another staff account or themselves. */
async function requireSuspendableMember(moderatorId: string, userId: string) {
  if (moderatorId === userId) throw new AppError('You cannot suspend your own account', 400);
  const target = await UserRepository.findById(userId);
  if (!target) throw new AppError('User not found', 404);
  if (target.role !== 'member') throw new AppError('Staff accounts cannot be suspended here', 403);
  return target;
}

export class ModerationService {
  static async listReports(status: ReportStatus, limit: number, offset: number) {
    const rows = await ModerationRepository.listReports(status, limit, offset);
    return rows.map((r) => toReport(r, false));
  }

  static async getReport(id: string) {
    const row = await ModerationRepository.findReport(id);
    if (!row) throw new AppError('Report not found', 404);
    return {
      ...toReport(row, true),
      history: row.reported_id ? await ModerationRepository.actionsFor(row.reported_id) : [],
    };
  }

  /** Records a decision on a report; resolving can also suspend the reported member. */
  static async decideReport(
    moderatorId: string,
    reportId: string,
    decision: { status: Exclude<ReportStatus, 'pending'>; note: string; suspendUser: boolean }
  ) {
    const report = await ModerationRepository.findReport(reportId);
    if (!report) throw new AppError('Report not found', 404);
    if (decision.suspendUser) {
      if (decision.status !== 'resolved') throw new AppError('Only a resolved report can suspend the member', 400);
      if (!report.reported_id) throw new AppError('The reported account no longer exists', 409);
      await requireSuspendableMember(moderatorId, report.reported_id);
    }

    const action = decision.status === 'resolved' ? 'resolve' : decision.status === 'rejected' ? 'reject' : 'review';
    await getDatabase().transaction(async (tx) => {
      await ModerationRepository.setReportDecision(tx, reportId, decision.status, moderatorId, decision.note);
      await ModerationRepository.recordAction(tx, { moderatorId, action, targetUserId: report.reported_id, reportId, note: decision.note });
      if (decision.suspendUser && report.reported_id) {
        await this.applySuspension(tx, moderatorId, report.reported_id, decision.note, reportId);
      }
    });
    if (decision.suspendUser && report.reported_id) this.disconnect(report.reported_id);
    console.info(`[Moderation] ${moderatorId} marked report ${reportId} ${decision.status}`);
    return this.getReport(reportId);
  }

  static async suspend(moderatorId: string, userId: string, note: string, reportId?: string) {
    await requireSuspendableMember(moderatorId, userId);
    await getDatabase().transaction((tx) => this.applySuspension(tx, moderatorId, userId, note, reportId));
    this.disconnect(userId);
    console.info(`[Moderation] ${moderatorId} suspended ${userId}`);
  }

  static async unsuspend(moderatorId: string, userId: string, note: string) {
    const target = await UserRepository.findById(userId);
    if (!target) throw new AppError('User not found', 404);
    if (target.status !== 'suspended') throw new AppError('This account is not suspended', 409);
    await getDatabase().transaction(async (tx) => {
      // Returns to the state the member can recover from themselves (sign in to reactivate).
      await UserRepository.setStatus(tx, userId, 'deactivated');
      await ModerationRepository.recordAction(tx, { moderatorId, action: 'unsuspend', targetUserId: userId, note });
    });
    console.info(`[Moderation] ${moderatorId} lifted the suspension of ${userId}`);
  }

  private static async applySuspension(tx: IDatabase, moderatorId: string, userId: string, note: string, reportId?: string) {
    await UserRepository.setStatus(tx, userId, 'suspended');
    await SessionRepository.revokeAllForUser(tx, userId);
    await ModerationRepository.recordAction(tx, { moderatorId, action: 'suspend', targetUserId: userId, reportId: reportId ?? null, note });
  }

  private static disconnect(userId: string) {
    getSocketServer()?.in(`user:${userId}`).disconnectSockets(true);
  }
}
