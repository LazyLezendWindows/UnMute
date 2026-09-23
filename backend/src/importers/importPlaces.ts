import { getDatabase, IDatabase } from '../config/database';
import { PlaceKind } from '../mappers/locationMapper';
import { EnsurePlaceInput, PlaceRepository } from '../repositories/placeRepository';
import { isWithinIndia } from '../services/location/distance.service';
import { ImportReport, displayName, newReport, pick, readCsv, toFloat, toInt, warn } from './csv';

/**
 * Imports the Local Government Directory (https://lgdirectory.gov.in → Download Directory).
 *
 * Accepts the LGD state, district, sub-district, village and urban local body downloads directly,
 * or any CSV with these columns (header spelling and case are flexible):
 *   state_code, state_name, district_code, district_name, subdistrict_code, subdistrict_name,
 *   village_code, village_name, town_code, town_name, town_type, latitude, longitude
 * Each row upserts its whole chain (state → district → sub-district → village, or district → town),
 * keyed on LGD codes when present, so files can be imported in any order and re-imported safely.
 */

const COLUMNS = {
  stateCode: ['statecode', 'statelgdcode'],
  stateName: ['statenameinenglish', 'statename', 'statenameenglish'],
  districtCode: ['districtcode', 'districtlgdcode'],
  districtName: ['districtnameinenglish', 'districtname', 'districtnameenglish'],
  subdistrictCode: ['subdistrictcode', 'subdistrictlgdcode', 'tehsilcode'],
  subdistrictName: ['subdistrictnameinenglish', 'subdistrictname', 'subdistrictnameenglish', 'tehsilname'],
  villageCode: ['villagecode', 'villagelgdcode'],
  villageName: ['villagenameinenglish', 'villagename', 'villagenameenglish'],
  townCode: ['towncode', 'localbodycode', 'localbodylgdcode'],
  townName: ['townname', 'localbodynameinenglish', 'localbodyname', 'localbodynameenglish'],
  townType: ['towntype', 'localbodytype', 'localbodytypename'],
  latitude: ['latitude', 'lat'],
  longitude: ['longitude', 'long', 'lng', 'lon'],
};

const BATCH_SIZE = 1000;

/** Municipal corporations are cities; municipalities, nagar panchayats etc. are towns. */
function townKind(type: string): PlaceKind {
  return /corporation|mahanagar/i.test(type) ? 'city' : 'town';
}

export async function importPlaces(filePath: string): Promise<ImportReport> {
  const report = newReport();
  const db = getDatabase();
  const cache = new Map<string, string>();
  let leaves: Required<EnsurePlaceInput>[] = [];
  let pending: { row: number; ensure: (tx: IDatabase) => Promise<void> }[] = [];

  const ensureCached = async (tx: IDatabase, key: string, input: EnsurePlaceInput): Promise<string> => {
    let id = cache.get(key);
    if (!id) {
      id = await PlaceRepository.ensure(tx, input);
      cache.set(key, id);
    }
    return id;
  };

  const flush = async () => {
    const batch = pending;
    pending = [];
    await db.transaction(async (tx) => {
      for (const item of batch) await item.ensure(tx);
      await PlaceRepository.upsertCodedBatch(tx, leaves);
    });
    leaves = [];
  };

  for await (const record of readCsv(filePath)) {
    report.rows++;
    const rowNumber = report.rows + 1; // +1 for the header line
    const v = (aliases: string[]) => pick(record, aliases);

    const stateCode = toInt(v(COLUMNS.stateCode));
    const stateName = displayName(v(COLUMNS.stateName));
    if (!stateCode && !stateName) {
      warn(report, `row ${rowNumber}: no state code or name`);
      continue;
    }

    const lat = toFloat(v(COLUMNS.latitude));
    const lng = toFloat(v(COLUMNS.longitude));
    const coords = lat !== null && lng !== null && isWithinIndia({ latitude: lat, longitude: lng }) ? { lat, lng } : null;

    pending.push({
      row: rowNumber,
      ensure: async (tx) => {
        const stateId = await ensureCached(tx, `state:${stateCode ?? stateName.toLowerCase()}`, {
          kind: 'state',
          name: stateName || `State ${stateCode}`,
          parentId: null,
          stateId: null,
          districtId: null,
          lgdCode: stateCode,
        });

        const districtCode = toInt(v(COLUMNS.districtCode));
        const districtName = displayName(v(COLUMNS.districtName));
        if (!districtCode && !districtName) {
          report.imported++;
          return;
        }
        const districtId = await ensureCached(tx, `district:${districtCode ?? `${stateId}:${districtName.toLowerCase()}`}`, {
          kind: 'district',
          name: districtName || `District ${districtCode}`,
          parentId: stateId,
          stateId,
          districtId: null,
          lgdCode: districtCode,
        });

        let parentId = districtId;
        const subCode = toInt(v(COLUMNS.subdistrictCode));
        const subName = displayName(v(COLUMNS.subdistrictName));
        if (subCode || subName) {
          parentId = await ensureCached(tx, `subdistrict:${subCode ?? `${districtId}:${subName.toLowerCase()}`}`, {
            kind: 'subdistrict',
            name: subName || `Sub-district ${subCode}`,
            parentId: districtId,
            stateId,
            districtId,
            lgdCode: subCode,
          });
        }

        const villageName = displayName(v(COLUMNS.villageName));
        const townName = displayName(v(COLUMNS.townName));
        const leafName = villageName || townName;
        if (!leafName) {
          report.imported++;
          return;
        }
        const leaf = {
          kind: villageName ? ('village' as const) : townKind(v(COLUMNS.townType)),
          name: leafName,
          parentId: villageName ? parentId : districtId,
          stateId,
          districtId,
          lgdCode: toInt(villageName ? v(COLUMNS.villageCode) : v(COLUMNS.townCode)),
          latitude: coords?.lat ?? null,
          longitude: coords?.lng ?? null,
        };
        if (leaf.lgdCode) {
          leaves.push(leaf as Required<EnsurePlaceInput>);
        } else {
          await PlaceRepository.ensure(tx, leaf);
        }
        report.imported++;
      },
    });

    if (pending.length >= BATCH_SIZE) await flush();
  }
  if (pending.length) await flush();
  return report;
}
