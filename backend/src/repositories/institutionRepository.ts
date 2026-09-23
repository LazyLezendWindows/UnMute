import crypto from 'crypto';
import { getDatabase, IDatabase } from '../config/database';
import { likePrefix } from './placeRepository';

export type InstitutionKind = 'university' | 'college' | 'standalone';

export interface InstitutionRow {
  id: string;
  aishe_code: string | null;
  name: string;
  short_name: string;
  kind: InstitutionKind;
  state_id: string | null;
  district_id: string | null;
  city: string;
  state_name: string | null;
  district_name: string | null;
}

const INSTITUTION_SELECT = `SELECT i.id, i.aishe_code, i.name, i.short_name, i.kind, i.state_id, i.district_id, i.city,
    s.name AS state_name, d.name AS district_name
  FROM institutions i
  LEFT JOIN places s ON s.id = i.state_id
  LEFT JOIN places d ON d.id = i.district_id`;

export interface InstitutionInput {
  aisheCode: string | null;
  name: string;
  shortName: string;
  kind: InstitutionKind;
  stateId: string | null;
  districtId: string | null;
  city: string;
}

export class InstitutionRepository {
  static findById(id: string): Promise<InstitutionRow | null> {
    return getDatabase().get(`${INSTITUTION_SELECT} WHERE i.id = ?`, [id]);
  }

  /**
   * Prefix search on the full name, the short name, or any word of the name ("tech" finds
   * "Indian Institute of Technology …"). Filtering is done here, never in the client.
   */
  static search(options: {
    term?: string;
    stateId?: string;
    districtId?: string;
    kind?: InstitutionKind;
    limit: number;
    offset: number;
  }): Promise<InstitutionRow[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let order = 'i.name';
    if (options.term) {
      const prefix = likePrefix(options.term);
      conditions.push('(i.name LIKE ? OR i.short_name LIKE ? OR i.name LIKE ?)');
      params.push(prefix, prefix, `% ${prefix}`);
      order = '(CASE WHEN i.short_name LIKE ? THEN 0 WHEN i.name LIKE ? THEN 1 ELSE 2 END), i.name';
    }
    if (options.stateId) {
      conditions.push('i.state_id = ?');
      params.push(options.stateId);
    }
    if (options.districtId) {
      conditions.push('i.district_id = ?');
      params.push(options.districtId);
    }
    if (options.kind) {
      conditions.push('i.kind = ?');
      params.push(options.kind);
    }
    const rankParams = options.term ? [likePrefix(options.term), likePrefix(options.term)] : [];
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    return getDatabase().query(
      `${INSTITUTION_SELECT} ${where} ORDER BY ${order} LIMIT ? OFFSET ?`,
      [...params, ...rankParams, options.limit, options.offset]
    );
  }

  /** Upserts by AISHE code when present; otherwise matches on (name, state). Returns the id. */
  static async ensure(tx: IDatabase, input: InstitutionInput): Promise<string> {
    const existing = input.aisheCode
      ? await tx.get<{ id: string }>('SELECT id FROM institutions WHERE aishe_code = ?', [input.aisheCode])
      : null;
    const match =
      existing ??
      (await tx.get<{ id: string }>(
        `SELECT id FROM institutions WHERE name = ? AND state_id <=> ? AND (aishe_code IS NULL OR ? IS NULL) LIMIT 1`,
        [input.name, input.stateId, input.aisheCode]
      ));

    if (match) {
      await tx.run(
        `UPDATE institutions SET aishe_code = COALESCE(?, aishe_code), name = ?,
           short_name = CASE WHEN ? <> '' THEN ? ELSE short_name END, kind = ?,
           state_id = COALESCE(?, state_id), district_id = COALESCE(?, district_id),
           city = CASE WHEN ? <> '' THEN ? ELSE city END
         WHERE id = ?`,
        [
          input.aisheCode,
          input.name,
          input.shortName,
          input.shortName,
          input.kind,
          input.stateId,
          input.districtId,
          input.city,
          input.city,
          match.id,
        ]
      );
      return match.id;
    }

    const id = crypto.randomUUID();
    await tx.run(
      `INSERT INTO institutions (id, aishe_code, name, short_name, kind, state_id, district_id, city)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.aisheCode, input.name, input.shortName, input.kind, input.stateId, input.districtId, input.city]
    );
    return id;
  }
}
