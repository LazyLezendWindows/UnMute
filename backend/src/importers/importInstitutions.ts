import { getDatabase, IDatabase } from '../config/database';
import { InstitutionKind, InstitutionRepository } from '../repositories/institutionRepository';
import { ImportReport, displayName, newReport, normalizeName, pick, readCsv, warn } from './csv';

/**
 * Imports the AISHE directory of higher-education institutions (https://aishe.gov.in → Directory):
 * the university, college and standalone-institution lists, one file at a time.
 *   aishe_code, name, state, district, city, kind, short_name
 * `kind` may be omitted: it is read from an institution-type column if present, else from the
 * AISHE code prefix (U- university, C- college, S- standalone), else from `defaultKind`.
 * Rows upsert on AISHE code, so re-importing a newer release updates names in place.
 */

const COLUMNS = {
  aisheCode: ['aishecode', 'aishe', 'aisheid'],
  name: ['name', 'institutionname', 'collegename', 'universityname', 'nameoftheinstitution'],
  shortName: ['shortname', 'abbreviation'],
  state: ['state', 'statename'],
  district: ['district', 'districtname'],
  city: ['city', 'town', 'cityname'],
  kind: ['kind', 'institutiontype', 'institutioncategory'],
};

function kindFrom(typeValue: string, aisheCode: string, fallback?: InstitutionKind): InstitutionKind | null {
  if (/univ/i.test(typeValue)) return 'university';
  if (/college/i.test(typeValue)) return 'college';
  if (/stand/i.test(typeValue)) return 'standalone';
  const prefix = aisheCode.charAt(0).toUpperCase();
  if (prefix === 'U') return 'university';
  if (prefix === 'C') return 'college';
  if (prefix === 'S') return 'standalone';
  return fallback ?? null;
}

async function placeLookups(tx: IDatabase) {
  const rows = await tx.query<{ id: string; kind: string; name: string; parent_id: string | null }>(
    `SELECT id, kind, name, parent_id FROM places WHERE kind IN ('state', 'district')`
  );
  const states = new Map<string, string>();
  const districts = new Map<string, string>();
  for (const r of rows) {
    if (r.kind === 'state') states.set(normalizeName(r.name), r.id);
    else if (r.parent_id) districts.set(`${r.parent_id}:${normalizeName(r.name)}`, r.id);
  }
  return { states, districts };
}

export async function importInstitutions(
  filePath: string,
  options: { defaultKind?: InstitutionKind } = {}
): Promise<ImportReport> {
  const report = newReport();
  const db = getDatabase();
  const { states, districts } = await placeLookups(db);

  let batch: Parameters<typeof InstitutionRepository.ensure>[1][] = [];
  const flush = async () => {
    const rows = batch;
    batch = [];
    await db.transaction(async (tx) => {
      for (const row of rows) await InstitutionRepository.ensure(tx, row);
    });
  };

  for await (const record of readCsv(filePath)) {
    report.rows++;
    const rowNumber = report.rows + 1;
    const name = displayName(pick(record, COLUMNS.name)).slice(0, 255);
    if (!name) {
      warn(report, `row ${rowNumber}: no institution name`);
      continue;
    }
    const aisheCode = pick(record, COLUMNS.aisheCode).toUpperCase().slice(0, 20);
    const kind = kindFrom(pick(record, COLUMNS.kind), aisheCode, options.defaultKind);
    if (!kind) {
      warn(report, `row ${rowNumber}: cannot tell whether "${name}" is a university, college or standalone institution`);
      continue;
    }
    const stateId = states.get(normalizeName(pick(record, COLUMNS.state))) ?? null;
    const districtId = stateId ? districts.get(`${stateId}:${normalizeName(pick(record, COLUMNS.district))}`) ?? null : null;

    batch.push({
      aisheCode: aisheCode || null,
      name,
      shortName: pick(record, COLUMNS.shortName).slice(0, 60),
      kind,
      stateId,
      districtId,
      city: displayName(pick(record, COLUMNS.city)).slice(0, 150),
    });
    report.imported++;
    if (batch.length >= 1000) await flush();
  }
  if (batch.length) await flush();
  return report;
}
