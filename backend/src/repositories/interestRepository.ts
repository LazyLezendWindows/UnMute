import { getDatabase, IDatabase } from '../config/database';
import { Interest } from '../mappers/profileMapper';
import { placeholders } from './sql';

export class InterestRepository {
  static listAll(): Promise<Interest[]> {
    return getDatabase().query('SELECT id, name, category, icon FROM interests ORDER BY category, name ASC');
  }

  /** Interests for many users in one query, keyed by user id (users without interests map to []). */
  static async forUsers(userIds: string[]): Promise<Map<string, Interest[]>> {
    const byUser = new Map<string, Interest[]>(userIds.map((id) => [id, []]));
    if (userIds.length === 0) return byUser;
    const rows = await getDatabase().query<Interest & { user_id: string }>(
      `SELECT ui.user_id, i.id, i.name, i.category, i.icon
       FROM user_interests ui
       JOIN interests i ON i.id = ui.interest_id
       WHERE ui.user_id IN (${placeholders(userIds.length)})
       ORDER BY i.category, i.name`,
      userIds
    );
    for (const { user_id, ...interest } of rows) {
      byUser.get(user_id)?.push(interest);
    }
    return byUser;
  }

  static async forUser(userId: string): Promise<Interest[]> {
    return (await this.forUsers([userId])).get(userId) ?? [];
  }

  static async countExisting(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const row = await getDatabase().get<{ n: number }>(
      `SELECT COUNT(*) AS n FROM interests WHERE id IN (${placeholders(ids.length)})`,
      ids
    );
    return Number(row?.n ?? 0);
  }

  static async replaceForUser(tx: IDatabase, userId: string, interestIds: string[]): Promise<void> {
    await tx.run('DELETE FROM user_interests WHERE user_id = ?', [userId]);
    if (interestIds.length === 0) return;
    await tx.run(
      `INSERT INTO user_interests (user_id, interest_id) VALUES ${interestIds.map(() => '(?, ?)').join(', ')}`,
      interestIds.flatMap((id) => [userId, id])
    );
  }
}
