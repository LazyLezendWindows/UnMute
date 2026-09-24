import { getDatabase } from '../config/database';
import { getSocketServer } from '../sockets/chatSocket';
import { placeholders } from '../repositories/sql';
import { dbTimestamp } from '../utils/time';

/** What others may see: null when the member hides their online status. */
export type Presence = { online: boolean; lastSeenAt: string | null } | null;

export class PresenceService {
  /** Which of `userIds` have an open connection (works across Socket.IO adapters). */
  static async onlineAmong(userIds: string[]): Promise<Set<string>> {
    const io = getSocketServer();
    if (!io || userIds.length === 0) return new Set();
    const sockets = await io.in(userIds.map((id) => `user:${id}`)).fetchSockets();
    return new Set(sockets.map((s) => s.data.userId as string));
  }

  /** Presence of several members, respecting each one's "show when I'm online" setting. */
  static async forUsers(userIds: string[]): Promise<Map<string, Presence>> {
    const ids = [...new Set(userIds)];
    const result = new Map<string, Presence>();
    if (ids.length === 0) return result;
    const [rows, online] = await Promise.all([
      getDatabase().query<{ user_id: string; show_online: number; last_seen_at: string | null }>(
        `SELECT p.user_id, p.show_online, u.last_seen_at
         FROM profiles p JOIN users u ON u.id = p.user_id
         WHERE p.user_id IN (${placeholders(ids.length)})`,
        ids
      ),
      this.onlineAmong(ids),
    ]);
    for (const row of rows) {
      result.set(row.user_id, row.show_online ? { online: online.has(row.user_id), lastSeenAt: row.last_seen_at } : null);
    }
    return result;
  }

  /**
   * Called when a member's first connection opens or last one closes: stamps "last seen" and tells
   * the people they chat with (only if the member shows their status).
   */
  static async changed(userId: string, online: boolean): Promise<void> {
    const now = dbTimestamp();
    await getDatabase().run('UPDATE users SET last_seen_at = ? WHERE id = ?', [now, userId]);
    const visible = await getDatabase().get<{ show_online: number }>('SELECT show_online FROM profiles WHERE user_id = ?', [userId]);
    if (!visible?.show_online) return;
    const partners = await getDatabase().query<{ other_id: string }>(
      `SELECT IF(user_a_id = ?, user_b_id, user_a_id) AS other_id FROM conversations
       WHERE (user_a_id = ? OR user_b_id = ?) AND status = 'accepted'`,
      [userId, userId, userId]
    );
    if (partners.length === 0) return;
    getSocketServer()
      ?.to(partners.map((p) => `user:${p.other_id}`))
      .emit('presence_changed', { userId, online, lastSeenAt: new Date(now.replace(' ', 'T') + 'Z').toISOString() });
  }
}
