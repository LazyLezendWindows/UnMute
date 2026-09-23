import { getDatabase, initDatabase } from '../config/database';
import { InstitutionKind } from '../repositories/institutionRepository';
import { ImportReport } from './csv';
import { importPlaces } from './importPlaces';
import { importPincodes } from './importPincodes';
import { importInstitutions } from './importInstitutions';

const USAGE = `Usage: npm run import:data -- <places|pincodes|institutions> <file.csv> [--kind university|college|standalone]

  places        LGD directory downloads (states, districts, sub-districts, villages, local bodies)
  pincodes      India Post "All India Pincode Directory" (import places first)
  institutions  AISHE university / college / standalone lists (import places first)`;

async function main() {
  const [dataset, file, ...rest] = process.argv.slice(2);
  if (!dataset || !file) {
    console.error(USAGE);
    process.exit(2);
  }
  const kindFlag = rest.indexOf('--kind');
  const defaultKind = kindFlag >= 0 ? (rest[kindFlag + 1] as InstitutionKind) : undefined;
  if (defaultKind && !['university', 'college', 'standalone'].includes(defaultKind)) {
    console.error(`Unknown --kind "${defaultKind}"\n\n${USAGE}`);
    process.exit(2);
  }

  await initDatabase();
  const started = Date.now();
  let report: ImportReport;
  switch (dataset) {
    case 'places':
      report = await importPlaces(file);
      break;
    case 'pincodes':
      report = await importPincodes(file);
      break;
    case 'institutions':
      report = await importInstitutions(file, { defaultKind });
      break;
    default:
      console.error(`Unknown dataset "${dataset}"\n\n${USAGE}`);
      process.exit(2);
  }

  console.log(
    `[Import] ${dataset}: ${report.rows} rows read, ${report.imported} imported, ${report.skipped} skipped ` +
      `in ${((Date.now() - started) / 1000).toFixed(1)}s`
  );
  for (const w of report.warnings) console.warn(`[Import]   ${w}`);
  if (report.skipped > report.warnings.length) {
    console.warn(`[Import]   …and ${report.skipped - report.warnings.length} more skipped rows`);
  }
  await getDatabase().close();
}

main().catch((err) => {
  console.error('[Import] Failed:', err);
  process.exit(1);
});
