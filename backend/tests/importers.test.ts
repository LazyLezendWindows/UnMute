import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { getDatabase } from '../src/config/database';
import { importPlaces } from '../src/importers/importPlaces';
import { importPincodes } from '../src/importers/importPincodes';
import { importInstitutions } from '../src/importers/importInstitutions';
import { displayName, normalizeName } from '../src/importers/csv';
import { resetTestDatabase } from './helpers';

let dir: string;

function fixture(name: string, content: string): string {
  const file = path.join(dir, name);
  fs.writeFileSync(file, content.trimStart());
  return file;
}

const count = async (sql: string, params: unknown[] = []) => Number((await getDatabase().get(sql, params)).n);

describe('Reference data importers', () => {
  beforeAll(async () => {
    await resetTestDatabase();
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'unmute-import-'));
  });

  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('normalises dataset names', () => {
    expect(displayName('NEW DELHI')).toBe('New Delhi');
    expect(displayName('K.V.RANGAREDDY')).toBe('K.V.Rangareddy');
    expect(displayName('Mixed Case Stays')).toBe('Mixed Case Stays');
    expect(normalizeName('THE DADRA & NAGAR HAVELI')).toBe('dadra and nagar haveli');
  });

  describe('LGD places', () => {
    // An LGD village download: BOM, quoted fields, "(In English)" headers, ALL-CAPS names.
    const villages = `\uFEFF"State Code","State Name (In English)","District Code","District Name (In English)","Sub-District Code","Sub-District Name (In English)","Village Code","Village Name (In English)"
36,Telangana,999001,Sangareddy,999101,Patancheru,999201,ISNAPUR
36,Telangana,999001,Sangareddy,999101,Patancheru,999202,"MUTHANGI, NEW"
36,Telangana,999001,Sangareddy,999102,Zaheerabad,999203,KOHIR
,,,,,,,ORPHAN VILLAGE
`;

    it('imports the full chain, matching the sample state by LGD code and district by name', async () => {
      const statesBefore = await count(`SELECT COUNT(*) n FROM places WHERE kind = 'state'`);
      const report = await importPlaces(fixture('villages.csv', villages));
      expect(report).toMatchObject({ rows: 4, imported: 3, skipped: 1 });
      expect(report.warnings[0]).toMatch(/row 5: no state/);

      expect(await count(`SELECT COUNT(*) n FROM places WHERE kind = 'state'`)).toBe(statesBefore);
      // The sample "Sangareddy" district (no code) is adopted rather than duplicated.
      const districts = await getDatabase().query(`SELECT lgd_code FROM places WHERE kind = 'district' AND name = 'Sangareddy'`);
      expect(districts).toEqual([{ lgd_code: 999001 }]);

      const muthangi = await getDatabase().get(
        `SELECT v.name, v.kind, sd.name AS parent, d.name AS district, s.name AS state
         FROM places v JOIN places sd ON sd.id = v.parent_id JOIN places d ON d.id = v.district_id JOIN places s ON s.id = v.state_id
         WHERE v.lgd_code = 999202`
      );
      expect(muthangi).toEqual({ name: 'Muthangi, New', kind: 'village', parent: 'Patancheru', district: 'Sangareddy', state: 'Telangana' });
    });

    it('is idempotent and applies renames on re-import', async () => {
      const total = await count('SELECT COUNT(*) n FROM places');
      await importPlaces(fixture('villages2.csv', villages.replace('ISNAPUR', 'ISNAPUR KHURD')));
      expect(await count('SELECT COUNT(*) n FROM places')).toBe(total);
      expect((await getDatabase().get('SELECT name FROM places WHERE lgd_code = 999201')).name).toBe('Isnapur Khurd');
    });

    it('imports urban local bodies as cities or towns under their district', async () => {
      const report = await importPlaces(
        fixture(
          'localbodies.csv',
          `State Code,State Name,District Code,District Name,Local Body Code,Local Body Name (In English),Local Body Type Name,Latitude,Longitude
36,Telangana,999001,Sangareddy,999301,Sangareddy Municipality,Municipality,17.62,78.08
36,Telangana,999001,Sangareddy,999302,Test Municipal Corporation,Municipal Corporation,NA,NA
36,Telangana,999001,Sangareddy,999303,Offshore Town,Municipality,51.5,-0.12
`
        )
      );
      expect(report.imported).toBe(3);
      const rows = await getDatabase().query(
        `SELECT name, kind, latitude FROM places WHERE lgd_code IN (999301, 999302, 999303) ORDER BY lgd_code`
      );
      expect(rows).toEqual([
        { name: 'Sangareddy Municipality', kind: 'town', latitude: '17.62000' },
        { name: 'Test Municipal Corporation', kind: 'city', latitude: null },
        { name: 'Offshore Town', kind: 'town', latitude: null }, // coordinates outside India are dropped
      ]);
    });
  });

  describe('India Post PIN codes', () => {
    it('aggregates offices per PIN code and matches upper-case state/district names', async () => {
      const report = await importPincodes(
        fixture(
          'pincodes.csv',
          `circlename,regionname,divisionname,officename,pincode,officetype,delivery,district,statename,latitude,longitude
Telangana Circle,Hyderabad Region,Medak Division,Muthangi B.O,502300,B.O,Delivery,SANGAREDDY,TELANGANA,17.50,78.20
Telangana Circle,Hyderabad Region,Medak Division,Patancheru S.O,502300,S.O,Delivery,SANGAREDDY,TELANGANA,17.54,78.26
Telangana Circle,Hyderabad Region,Medak Division,Nowhere B.O,502300,B.O,Delivery,SANGAREDDY,TELANGANA,NA,NA
Unknown Circle,,,Mystery B.O,799999,B.O,Delivery,SOMEWHERE,ATLANTIS,,
Bad,,,Bad,01234,B.O,Delivery,X,Y,,
`
        )
      );
      expect(report).toMatchObject({ rows: 5, imported: 2, skipped: 1 });
      expect(report.warnings.join('\n')).toMatch(/ATLANTIS/);

      const pin = await getDatabase().get(
        `SELECT pc.area_name, pc.latitude, pc.longitude, d.name AS district, s.name AS state
         FROM pincodes pc LEFT JOIN places d ON d.id = pc.district_id LEFT JOIN places s ON s.id = pc.state_id
         WHERE pincode = '502300'`
      );
      expect(pin).toEqual({ area_name: 'Patancheru', latitude: '17.52000', longitude: '78.23000', district: 'Sangareddy', state: 'Telangana' });
      expect(await getDatabase().get(`SELECT district_id, state_id FROM pincodes WHERE pincode = '799999'`)).toEqual({
        district_id: null,
        state_id: null,
      });
    });
  });

  describe('AISHE institutions', () => {
    const aishe = `"Aishe Code","Name","State","District","Website"
"U-9001","TEST UNIVERSITY OF TELANGANA","Telangana","Sangareddy","https://example.edu"
"C-9002","Test Degree College","TELANGANA","SANGAREDDY",""
"S-9003","Test Standalone Institute","Telangana","",""
"","Nameless Kind Institute","Telangana","",""
"U-9004","","Telangana","",""
`;

    it('imports with kind from the AISHE code prefix and resolves state and district', async () => {
      const report = await importInstitutions(fixture('aishe.csv', aishe));
      expect(report).toMatchObject({ rows: 5, imported: 3, skipped: 2 });

      const rows = await getDatabase().query(
        `SELECT i.aishe_code, i.name, i.kind, s.name AS state, d.name AS district
         FROM institutions i LEFT JOIN places s ON s.id = i.state_id LEFT JOIN places d ON d.id = i.district_id
         WHERE i.aishe_code LIKE '_-900%' ORDER BY i.aishe_code`
      );
      expect(rows).toEqual([
        { aishe_code: 'C-9002', name: 'Test Degree College', kind: 'college', state: 'Telangana', district: 'Sangareddy' },
        { aishe_code: 'S-9003', name: 'Test Standalone Institute', kind: 'standalone', state: 'Telangana', district: null },
        { aishe_code: 'U-9001', name: 'Test University Of Telangana', kind: 'university', state: 'Telangana', district: 'Sangareddy' },
      ]);
    });

    it('uses --kind for rows without a code, and re-imports update in place', async () => {
      const total = await count('SELECT COUNT(*) n FROM institutions');
      const report = await importInstitutions(fixture('aishe2.csv', aishe.replace('Test Degree College', 'Test Degree College (Autonomous)')), {
        defaultKind: 'college',
      });
      expect(report.imported).toBe(4);
      expect(await count('SELECT COUNT(*) n FROM institutions')).toBe(total + 1); // only the code-less row is new
      expect((await getDatabase().get(`SELECT name FROM institutions WHERE aishe_code = 'C-9002'`)).name).toBe(
        'Test Degree College (Autonomous)'
      );
    });
  });
});
