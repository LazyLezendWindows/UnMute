import { getDatabase } from '../config/database';

export interface UserEducationRow {
  user_id: string;
  institution_id: string;
  course: string;
  start_year: number | null;
  end_year: number | null;
}

export class UserEducationRepository {
  static find(userId: string): Promise<UserEducationRow | null> {
    return getDatabase().get(
      'SELECT user_id, institution_id, course, start_year, end_year FROM user_education WHERE user_id = ?',
      [userId]
    );
  }

  static async upsert(
    userId: string,
    education: { institutionId: string; course: string; startYear: number | null; endYear: number | null }
  ): Promise<void> {
    await getDatabase().run(
      `INSERT INTO user_education (user_id, institution_id, course, start_year, end_year)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE institution_id = VALUES(institution_id), course = VALUES(course),
         start_year = VALUES(start_year), end_year = VALUES(end_year)`,
      [userId, education.institutionId, education.course, education.startYear, education.endYear]
    );
  }

  static async remove(userId: string): Promise<void> {
    await getDatabase().run('DELETE FROM user_education WHERE user_id = ?', [userId]);
  }
}
