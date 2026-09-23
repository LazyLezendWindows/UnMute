import { getDatabase, IDatabase } from '../config/database';
import { PincodeRepository } from '../repositories/pincodeRepository';
import { isWithinIndia } from '../services/location/distance.service';
import { ImportReport, displayName, newReport, normalizeName, pick, readCsv, toFloat, warn } from './csv';

/**
 * Imports the India Post "All India Pincode Directory" (data.gov.in), one row per post office:
 *   officename, pincode, officetype, district, statename, latitude, longitude
 * Offices are aggregated per PIN code: coordinates are averaged over offices with plausible
 * values, and the area name is taken from the head or sub office where there is one.
 * States and districts are matched by name against places already imported from LGD; PIN codes
 * whose district cannot be matched are still imported, attached to their state only.
 */

const COLUMNS = {
  pincode: ['pincode', 'pin', 'postalcode'],
  office: ['officename', 'office', 'areaname', 'area'],
  officeType: ['officetype'],
  district: ['district', 'districtname'],
  state: ['statename', 'state'],
  latitude: ['latitude', 'lat'],
  longitude: ['longitude', 'long', 'lng', 'lon'],
};

interface PinAggregate {
  area: string;
  areaRank: number;
  district: string;
  state: string;
  latSum: number;
  lngSum: number;
  points: number;
}

/** Head offices name an area best, then sub offices, then branch offices. */
function officeRank(type: string): number {
  const t = type.toUpperCase().replace(/[^A-Z]/g, '');
  return t === 'HO' ? 0 : t === 'SO' ? 1 : 2;
}

function cleanOfficeName(name: string): string {
  return displayName(name.replace(/\s+(H\.?O|S\.?O|B\.?O|G\.?P\.?O)\.?$/i, ''));
}

async function placeLookups(tx: IDatabase) {
  const rows = await tx.query<{ id: string; kind: string; name: string; parent_id: string | null }>(
    `SELECT id, kind, name, parent_id FROM places WHERE kind IN ('state', 'district')`
  );
  const states = new Map<string, string>();
  const districts = new Map<string, string>();
  for (const r of rows) {
    if (r.kind === 'state') states.set(normalizeName(r.name), r.id);
  }
  for (const r of rows) {
    if (r.kind === 'district' && r.parent_id) districts.set(`${r.parent_id}:${normalizeName(r.name)}`, r.id);
  }
  return { states, districts };
}

export async function importPincodes(filePath: string): Promise<ImportReport> {
  const report = newReport();
  const byPin = new Map<string, PinAggregate>();

  for await (const record of readCsv(filePath)) {
    report.rows++;
    const pincode = pick(record, COLUMNS.pincode).replace(/\s/g, '');
    if (!/^[1-9]\d{5}$/.test(pincode)) {
      warn(report, `row ${report.rows + 1}: invalid PIN code "${pincode}"`);
      continue;
    }
    const agg =
      byPin.get(pincode) ??
      ({ area: '', areaRank: 9, district: '', state: '', latSum: 0, lngSum: 0, points: 0 } as PinAggregate);
    const rank = officeRank(pick(record, COLUMNS.officeType));
    const office = pick(record, COLUMNS.office);
    if (office && rank < agg.areaRank) {
      agg.area = cleanOfficeName(office);
      agg.areaRank = rank;
    }
    agg.district ||= pick(record, COLUMNS.district);
    agg.state ||= pick(record, COLUMNS.state);
    const lat = toFloat(pick(record, COLUMNS.latitude));
    const lng = toFloat(pick(record, COLUMNS.longitude));
    if (lat !== null && lng !== null && isWithinIndia({ latitude: lat, longitude: lng })) {
      agg.latSum += lat;
      agg.lngSum += lng;
      agg.points++;
    }
    byPin.set(pincode, agg);
  }

  const db = getDatabase();
  const { states, districts } = await placeLookups(db);
  const unmatchedStates = new Set<string>();
  const entries = [...byPin.entries()];

  for (let i = 0; i < entries.length; i += 1000) {
    await db.transaction(async (tx) => {
      for (const [pincode, agg] of entries.slice(i, i + 1000)) {
        const stateId = states.get(normalizeName(agg.state)) ?? null;
        if (!stateId && agg.state) unmatchedStates.add(agg.state);
        const districtId = stateId ? districts.get(`${stateId}:${normalizeName(agg.district)}`) ?? null : null;
        await PincodeRepository.upsert(tx, {
          pincode,
          areaName: agg.area,
          districtId,
          stateId,
          latitude: agg.points ? Number((agg.latSum / agg.points).toFixed(5)) : null,
          longitude: agg.points ? Number((agg.lngSum / agg.points).toFixed(5)) : null,
        });
        report.imported++;
      }
    });
  }

  for (const state of unmatchedStates) {
    report.warnings.push(`state "${state}" did not match any imported state; its PIN codes have no state`);
  }
  return report;
}
