import crypto from 'crypto';
import { getDatabase, IDatabase } from '../config/database';
import { PlaceKind } from '../mappers/locationMapper';
import { Coordinates, boundingBox, haversineParams, haversineSql } from '../services/location/distance.service';

export interface PlaceRow {
  id: string;
  kind: PlaceKind;
  name: string;
  parent_id: string | null;
  state_id: string | null;
  district_id: string | null;
  lgd_code: number | null;
  latitude: string | null;
  longitude: string | null;
  district_name: string | null;
  state_name: string | null;
}

const PLACE_COLUMNS = `pl.id, pl.kind, pl.name, pl.parent_id, pl.state_id, pl.district_id, pl.lgd_code,
    pl.latitude, pl.longitude, d.name AS district_name, s.name AS state_name`;
const PLACE_FROM = `places pl
  LEFT JOIN places d ON d.id = pl.district_id
  LEFT JOIN places s ON s.id = pl.state_id`;
const PLACE_SELECT = `SELECT ${PLACE_COLUMNS} FROM ${PLACE_FROM}`;

/** Search ranking: settlements people actually say they live in come first. */
const KIND_RANK = `FIELD(pl.kind, 'city', 'town', 'district', 'village', 'subdistrict', 'state')`;

/** Escapes LIKE wildcards so user input only ever matches literally. */
export function likePrefix(term: string): string {
  return `${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

export interface EnsurePlaceInput {
  kind: PlaceKind;
  name: string;
  parentId: string | null;
  stateId: string | null;
  districtId: string | null;
  lgdCode?: number | null;
  latitude?: number | null;
  longitude?: number | null;
}

export class PlaceRepository {
  static findById(id: string): Promise<PlaceRow | null> {
    return getDatabase().get(`${PLACE_SELECT} WHERE pl.id = ?`, [id]);
  }

  static states(): Promise<PlaceRow[]> {
    return getDatabase().query(`${PLACE_SELECT} WHERE pl.kind = 'state' ORDER BY pl.name`);
  }

  static children(parentId: string, term: string | undefined, limit: number, offset: number): Promise<PlaceRow[]> {
    const params: unknown[] = [parentId];
    let filter = '';
    if (term) {
      filter = 'AND pl.name LIKE ?';
      params.push(likePrefix(term));
    }
    return getDatabase().query(
      `${PLACE_SELECT} WHERE pl.parent_id = ? ${filter} ORDER BY ${KIND_RANK}, pl.name LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
  }

  /** Name-prefix search across the hierarchy, optionally narrowed to kinds and/or a state. */
  static search(term: string, options: { kinds?: PlaceKind[]; stateId?: string; limit: number }): Promise<PlaceRow[]> {
    const conditions = ['pl.name LIKE ?'];
    const params: unknown[] = [likePrefix(term)];
    if (options.kinds?.length) {
      conditions.push(`pl.kind IN (${options.kinds.map(() => '?').join(', ')})`);
      params.push(...options.kinds);
    }
    if (options.stateId) {
      conditions.push('(pl.state_id = ? OR pl.id = ?)');
      params.push(options.stateId, options.stateId);
    }
    return getDatabase().query(
      `${PLACE_SELECT} WHERE ${conditions.join(' AND ')}
       ORDER BY ${KIND_RANK}, CHAR_LENGTH(pl.name), pl.name
       LIMIT ?`,
      [...params, options.limit]
    );
  }

  /** The nearest place of the given kinds within `maxKm`, for turning a device position into an area. */
  static async nearest(point: Coordinates, kinds: PlaceKind[], maxKm: number): Promise<PlaceRow | null> {
    const box = boundingBox(point, maxKm);
    const distance = haversineSql('pl.latitude', 'pl.longitude');
    return getDatabase().get(
      `SELECT * FROM (
         SELECT ${PLACE_COLUMNS}, ${distance} AS distance_km FROM ${PLACE_FROM}
         WHERE pl.kind IN (${kinds.map(() => '?').join(', ')})
           AND pl.latitude BETWEEN ? AND ? AND pl.longitude BETWEEN ? AND ?
       ) candidates
       WHERE distance_km <= ?
       ORDER BY distance_km
       LIMIT 1`,
      [...haversineParams(point), ...kinds, box.minLat, box.maxLat, box.minLng, box.maxLng, maxKm]
    );
  }

  /**
   * Approximate coordinates for a place: its own, else its parent's, else its district's.
   * Villages imported from LGD usually have none of their own.
   */
  static async coordinatesFor(place: PlaceRow): Promise<Coordinates | null> {
    const own = toCoordinates(place);
    if (own) return own;
    const ancestorIds = [place.parent_id, place.district_id].filter((id): id is string => Boolean(id));
    if (ancestorIds.length === 0) return null;
    const rows = await getDatabase().query<{ id: string; latitude: string | null; longitude: string | null }>(
      `SELECT id, latitude, longitude FROM places WHERE id IN (${ancestorIds.map(() => '?').join(', ')})`,
      ancestorIds
    );
    for (const id of ancestorIds) {
      const coords = toCoordinates(rows.find((r) => r.id === id));
      if (coords) return coords;
    }
    return null;
  }

  /**
   * Finds a place by LGD code, else by (parent, kind, name), else creates it; fills in a missing
   * LGD code or coordinates on an existing row. Used by the sample seed and the dataset importers.
   */
  static async ensure(tx: IDatabase, input: EnsurePlaceInput): Promise<string> {
    const lat = input.latitude ?? null;
    const lng = input.longitude ?? null;

    if (input.lgdCode) {
      const byCode = await tx.get<{ id: string }>('SELECT id FROM places WHERE kind = ? AND lgd_code = ?', [
        input.kind,
        input.lgdCode,
      ]);
      if (byCode) {
        await tx.run(
          `UPDATE places SET name = ?, parent_id = ?, state_id = ?, district_id = ?,
             latitude = COALESCE(?, latitude), longitude = COALESCE(?, longitude)
           WHERE id = ?`,
          [input.name, input.parentId, input.stateId, input.districtId, lat, lng, byCode.id]
        );
        return byCode.id;
      }
    }

    const byName = await tx.get<{ id: string }>(
      `SELECT id FROM places WHERE parent_id <=> ? AND kind = ? AND name = ?
         AND (lgd_code IS NULL OR ? IS NULL)
       LIMIT 1`,
      [input.parentId, input.kind, input.name, input.lgdCode ?? null]
    );
    if (byName) {
      await tx.run(
        `UPDATE places SET lgd_code = COALESCE(lgd_code, ?),
           latitude = COALESCE(latitude, ?), longitude = COALESCE(longitude, ?)
         WHERE id = ?`,
        [input.lgdCode ?? null, lat, lng, byName.id]
      );
      return byName.id;
    }

    const id = crypto.randomUUID();
    await tx.run(
      `INSERT INTO places (id, kind, name, parent_id, state_id, district_id, lgd_code, latitude, longitude)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.kind, input.name, input.parentId, input.stateId, input.districtId, input.lgdCode ?? null, lat, lng]
    );
    return id;
  }

  /**
   * Bulk upsert of leaf places that all carry LGD codes (e.g. villages), keyed on (kind, lgd_code).
   * One statement per batch keeps a full LGD import (~650k villages) practical.
   */
  static async upsertCodedBatch(tx: IDatabase, rows: Required<EnsurePlaceInput>[]): Promise<void> {
    if (rows.length === 0) return;
    const values = rows.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
    const params = rows.flatMap((r) => [
      crypto.randomUUID(),
      r.kind,
      r.name,
      r.parentId,
      r.stateId,
      r.districtId,
      r.lgdCode,
      r.latitude,
      r.longitude,
    ]);
    await tx.run(
      `INSERT INTO places (id, kind, name, parent_id, state_id, district_id, lgd_code, latitude, longitude)
       VALUES ${values}
       ON DUPLICATE KEY UPDATE name = VALUES(name), parent_id = VALUES(parent_id), state_id = VALUES(state_id),
         district_id = VALUES(district_id),
         latitude = COALESCE(VALUES(latitude), latitude), longitude = COALESCE(VALUES(longitude), longitude)`,
      params
    );
  }

  /** Resolves a district by name within a state (case-insensitive), for PIN and AISHE imports. */
  static findDistrictByName(tx: IDatabase, stateId: string, name: string): Promise<{ id: string } | null> {
    return tx.get(`SELECT id FROM places WHERE kind = 'district' AND parent_id = ? AND name = ? LIMIT 1`, [
      stateId,
      name,
    ]);
  }

  static findStateByName(tx: IDatabase, name: string): Promise<{ id: string } | null> {
    return tx.get(`SELECT id FROM places WHERE kind = 'state' AND name = ? LIMIT 1`, [name]);
  }
}

export function toCoordinates(
  row: { latitude: string | number | null; longitude: string | number | null } | null | undefined
): Coordinates | null {
  if (!row || row.latitude === null || row.longitude === null) return null;
  const latitude = Number(row.latitude);
  const longitude = Number(row.longitude);
  return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null;
}
