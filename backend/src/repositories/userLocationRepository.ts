import { getDatabase, IDatabase } from '../config/database';
import { LabelPrecision } from '../mappers/locationMapper';
import { Coordinates } from '../services/location/distance.service';

export type LocationSource = 'place' | 'pincode' | 'device';

export interface UserLocationRow {
  user_id: string;
  place_id: string | null;
  pincode: string | null;
  latitude: string | null;
  longitude: string | null;
  source: LocationSource;
  label_precision: LabelPrecision;
}

export class UserLocationRepository {
  static find(userId: string): Promise<UserLocationRow | null> {
    return getDatabase().get(
      `SELECT user_id, place_id, pincode, latitude, longitude, source, label_precision
       FROM user_locations WHERE user_id = ?`,
      [userId]
    );
  }

  /** `coordinates` must already be coarsened; this layer stores whatever it is given. */
  static async upsert(
    tx: IDatabase,
    userId: string,
    location: {
      placeId: string | null;
      pincode: string | null;
      coordinates: Coordinates | null;
      source: LocationSource;
      precision: LabelPrecision;
    }
  ): Promise<void> {
    await tx.run(
      `INSERT INTO user_locations (user_id, place_id, pincode, latitude, longitude, source, label_precision)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE place_id = VALUES(place_id), pincode = VALUES(pincode),
         latitude = VALUES(latitude), longitude = VALUES(longitude),
         source = VALUES(source), label_precision = VALUES(label_precision)`,
      [
        userId,
        location.placeId,
        location.pincode,
        location.coordinates?.latitude ?? null,
        location.coordinates?.longitude ?? null,
        location.source,
        location.precision,
      ]
    );
  }

  static async setPrecision(userId: string, precision: LabelPrecision): Promise<boolean> {
    const { changes } = await getDatabase().run('UPDATE user_locations SET label_precision = ? WHERE user_id = ?', [
      precision,
      userId,
    ]);
    return changes > 0;
  }

  static async remove(userId: string): Promise<void> {
    await getDatabase().run('DELETE FROM user_locations WHERE user_id = ?', [userId]);
  }
}
