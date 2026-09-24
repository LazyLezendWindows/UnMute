import { safeAvatarUrl } from '../utils/avatar';
import { AppError } from '../middleware/errorHandler';
import { calculateAge } from '../utils/age';
import { ReportCategory } from '../config/constants';
import { getSocketServer } from '../sockets/chatSocket';
import { SafetyRepository } from '../repositories/safetyRepository';
import { ConversationRepository } from '../repositories/conversationRepository';
import { MessageRepository } from '../repositories/messageRepository';
import { ProfileRepository } from '../repositories/profileRepository';
import { assertUserExists } from './userGuards';
import { dbTimestamp } from '../utils/time';
import { getDatabase } from '../config/database';
import { ChatRequestRepository } from '../repositories/chatRequestRepository';

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

/** A repeat report about the same member within this window is folded into the open one. */
const DUPLICATE_REPORT_WINDOW_MS = 24 * 60 * 60 * 1000;
/** How many of the latest messages between the two members are preserved with a report. */
const EVIDENCE_MESSAGE_LIMIT = 50;

/**
 * What the moderators will see, frozen at report time: the reported profile as it looked and the
 * latest messages between the two members. It survives later edits, message deletion and
 * account deletion. Participants are labelled by role, not by account id.
 */
async function captureEvidence(reporterId: string, reportedId: string) {
  const conversationIds = await ConversationRepository.idsBetween(reporterId, reportedId);
  const [profile, messages] = await Promise.all([
    ProfileRepository.findByUserId(reportedId),
    MessageRepository.recentBetween(conversationIds, EVIDENCE_MESSAGE_LIMIT),
  ]);
  return {
    conversationId: conversationIds[0] ?? null,
    evidence: JSON.stringify({
      capturedAt: new Date().toISOString(),
      reportedProfile: profile
        ? { displayName: profile.display_name, bio: profile.bio || '', avatarUrl: profile.avatar_url || '' }
        : null,
      messages: messages.map((m) => ({
        from: m.sender_id === reportedId ? 'reported' : 'reporter',
        content: m.content,
        attachmentUrl: m.attachment_url ?? null,
        createdAt: m.created_at,
      })),
    }),
  };
}

export class SafetyService {
  static async blockUser(blockerId: string, blockedId: string, reason = '') {
    if (blockerId === blockedId) {
      throw new AppError('Cannot block yourself', 400);
    }
    await assertUserExists(blockedId);
    await SafetyRepository.block(blockerId, blockedId, reason);
    // An open request between the two closes for good (unblocking later does not reopen it).
    const closedRequest = await getDatabase().transaction((tx) => ChatRequestRepository.closePendingBetween(tx, blockerId, blockedId));
    if (closedRequest) getSocketServer()?.to(`user:${blockerId}`).emit('chat_request_removed', { requestId: closedRequest });
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
      avatarUrl: safeAvatarUrl(b.avatar_url),
    }));
  }

  static async reportUser(reporterId: string, reportedId: string, category: ReportCategory, details = '') {
    if (reporterId === reportedId) {
      throw new AppError('Cannot report yourself', 400);
    }
    await assertUserExists(reportedId);

    // Re-submitting (double taps, repeated reports) does not flood the moderation queue.
    const since = dbTimestamp(new Date(Date.now() - DUPLICATE_REPORT_WINDOW_MS));
    const open = await SafetyRepository.findRecentPendingReport(reporterId, reportedId, since);
    if (open) {
      return { success: true, message: 'You have already reported this member. Our safety team will review it.' };
    }

    const { conversationId, evidence } = await captureEvidence(reporterId, reportedId);
    const reportId = await SafetyRepository.insertReport({ reporterId, reportedId, category, details, conversationId, evidence });
    console.info(`[Safety] Report ${reportId} filed (${category})`);
    return { success: true, message: 'Report submitted. Our safety team will review this.' };
  }
}
