import { getDatabase } from '../config/database';
import { config } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import { ResolvedSession } from './sessionService';
import { ProfileService } from './profileService';
import { UserRepository } from '../repositories/userRepository';
import { SessionRepository } from '../repositories/sessionRepository';
import { AuthAccountRepository } from '../repositories/authAccountRepository';
import { AccountDataRepository } from '../repositories/accountDataRepository';
import { getSocketServer } from '../sockets/chatSocket';
import { ProfileRepository } from '../repositories/profileRepository';
import { PhotoService } from './photoService';

function disconnectEverywhere(userId: string): void {
  getSocketServer()?.in(`user:${userId}`).disconnectSockets(true);
}

/** The member's own account lifecycle: export, deactivation and permanent deletion. */
export class AccountService {
  /** Everything Unmute stores about the member, as plain JSON (no password hashes or session tokens). */
  static async exportData(userId: string) {
    const account = await AccountDataRepository.account(userId);
    if (!account) throw new AppError('User not found', 404);
    const [profile, signInMethods, likes, passes, matches, messages, blocks, reports, sessions] = await Promise.all([
      ProfileService.getProfile(userId),
      AuthAccountRepository.listForUser(userId),
      AccountDataRepository.likesGiven(userId),
      AccountDataRepository.passesGiven(userId),
      AccountDataRepository.matches(userId),
      AccountDataRepository.messagesSent(userId),
      AccountDataRepository.blocks(userId),
      AccountDataRepository.reportsFiled(userId),
      AccountDataRepository.sessions(userId),
    ]);
    return {
      exportedAt: new Date().toISOString(),
      account: {
        id: account.id,
        email: account.email,
        status: account.status,
        createdAt: account.created_at,
        signInMethods: signInMethods.map((m) => ({ provider: m.provider, linkedAt: m.created_at })),
      },
      profile,
      likesGiven: likes.map((l) => ({ userId: l.user_id, createdAt: l.created_at })),
      passesGiven: passes.map((p) => ({ userId: p.user_id, createdAt: p.created_at })),
      matches: matches.map((m) => ({ matchId: m.id, userId: m.user_id, createdAt: m.created_at })),
      messagesSent: messages.map((m) => ({ conversationId: m.conversation_id, content: m.content, createdAt: m.created_at })),
      blockedUsers: blocks.map((b) => ({ userId: b.user_id, reason: b.reason, createdAt: b.created_at })),
      reportsFiled: reports.map((r) => ({
        userId: r.user_id,
        category: r.reason_category,
        details: r.details || '',
        status: r.status,
        createdAt: r.created_at,
      })),
      sessions: sessions.map((s) => ({
        createdAt: s.created_at,
        lastUsedAt: s.last_used_at,
        expiresAt: s.expires_at,
        revokedAt: s.revoked_at,
        ipAddress: s.ip_address,
        userAgent: s.user_agent,
      })),
    };
  }

  /** Hides the member everywhere and signs them out on every device; signing in again reactivates. */
  static async deactivate(userId: string): Promise<void> {
    await getDatabase().transaction(async (tx) => {
      await UserRepository.setStatus(tx, userId, 'deactivated');
      await SessionRepository.revokeAllForUser(tx, userId);
    });
    disconnectEverywhere(userId);
    console.info(`[Account] ${userId} deactivated their account`);
  }

  /**
   * Permanently deletes the account and everything it owns (profile, photos, interests, location,
   * likes, matches, conversations, sessions). Reports about or by the member are kept for
   * moderation with the account reference cleared. Requires a recent sign-in so a stolen or
   * forgotten session cannot destroy the account.
   */
  static async deleteAccount(session: ResolvedSession): Promise<void> {
    if (session.ageSeconds > config.recentAuthMinutes * 60) {
      throw new AppError('For your security, please sign in again before deleting your account.', 403, 'REAUTH_REQUIRED');
    }
    const profile = await ProfileRepository.findByUserId(session.userId);
    await getDatabase().transaction((tx) => UserRepository.delete(tx, session.userId));
    disconnectEverywhere(session.userId);
    void PhotoService.deleteUploaded(profile?.avatar_url);
    console.info(`[Account] ${session.userId} deleted their account`);
  }
}
