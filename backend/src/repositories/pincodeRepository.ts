import { getDatabase, IDatabase } from '../config/database';

export interface PincodeRow {
  pincode: string;
  area_name: string;
  district_id: string | null;
  state_id: string | null;
  latitude: string | null;
  longitude: string | null;
  district_name: string | null;
  state_name: string | null;
}

export class PincodeRepository {
  static find(pincode: string): Promise<PincodeRow | null> {
    return getDatabase().get(
      `SELECT pc.pincode, pc.area_name, pc.district_id, pc.state_id, pc.latitude, pc.longitude,
              d.name AS district_name, s.name AS state_name
       FROM pincodes pc
       LEFT JOIN places d ON d.id = pc.district_id
       LEFT JOIN places s ON s.id = pc.state_id
       WHERE pc.pincode = ?`,
      [pincode]
    );
  }

  static async upsert(
    tx: IDatabase,
    row: {
      pincode: string;
      areaName: string;
      districtId: string | null;
      stateId: string | null;
      latitude: number | null;
      longitude: number | null;
    }
  ): Promise<void> {
    await tx.run(
      `INSERT INTO pincodes (pincode, area_name, district_id, state_id, latitude, longitude)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE area_name = VALUES(area_name),
         district_id = COALESCE(VALUES(district_id), district_id),
         state_id = COALESCE(VALUES(state_id), state_id),
         latitude = COALESCE(VALUES(latitude), latitude),
         longitude = COALESCE(VALUES(longitude), longitude)`,
      [row.pincode, row.areaName, row.districtId, row.stateId, row.latitude, row.longitude]
    );
  }
}
