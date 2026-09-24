import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { getDatabase } from '../src/config/database';
import { ALLOWED_RADII_KM, snapToGrid } from '../src/services/location/distance.service';
import { resetTestDatabase } from './helpers';

const app = createApp();
const MISSING_ID = '00000000-0000-4000-8000-000000000000';

async function registerAgent(email: string, displayName: string, dateOfBirth = '1997-03-10') {
  const agent = request.agent(app);
  const res = await agent.post('/api/v1/auth/register').send({ email, password: 'Password123!', displayName, dateOfBirth });
  expect(res.status).toBe(201);
  return { agent, id: res.body.data.user.id as string };
}

async function placeId(name: string, kind: string): Promise<string> {
  const row = await getDatabase().get<{ id: string }>('SELECT id FROM places WHERE name = ? AND kind = ?', [name, kind]);
  if (!row) throw new Error(`fixture place ${kind} ${name} missing`);
  return row.id;
}

async function institutionId(shortName: string): Promise<string> {
  const row = await getDatabase().get<{ id: string }>('SELECT id FROM institutions WHERE short_name = ?', [shortName]);
  if (!row) throw new Error(`fixture institution ${shortName} missing`);
  return row.id;
}

/** Fails if any coordinate-like field appears anywhere in a response body. */
function expectNoCoordinates(body: unknown) {
  expect(JSON.stringify(body)).not.toMatch(/"(latitude|longitude|lat|lng|distance_km)"/);
}

describe('Locations, education & discovery filters', () => {
  beforeAll(async () => {
    await resetTestDatabase();
  });

  describe('Place lookup', () => {
    let viewer: request.Agent;

    beforeAll(async () => {
      ({ agent: viewer } = await registerAgent('lookup@example.com', 'Lookup'));
    });

    it('requires a session', async () => {
      const res = await request(app).get('/api/v1/locations/states');
      expect(res.status).toBe(401);
    });

    it('lists all states and union territories', async () => {
      const res = await viewer.get('/api/v1/locations/states');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(36);
      expect(res.body.data.map((s: any) => s.name)).toContain('Telangana');
      expectNoCoordinates(res.body);
    });

    it('walks the hierarchy from state to district to settlement', async () => {
      const telangana = await placeId('Telangana', 'state');
      const districts = await viewer.get(`/api/v1/locations/${telangana}/children`);
      expect(districts.status).toBe(200);
      const sangareddy = districts.body.data.find((d: any) => d.name === 'Sangareddy');
      expect(sangareddy.kind).toBe('district');

      const inDistrict = await viewer.get(`/api/v1/locations/${sangareddy.id}/children`);
      expect(inDistrict.body.data.map((p: any) => `${p.kind}:${p.name}`)).toEqual(
        expect.arrayContaining(['town:Sangareddy', 'subdistrict:Sangareddy'])
      );
    });

    it('returns 404 for children of an unknown place', async () => {
      const res = await viewer.get(`/api/v1/locations/${MISSING_ID}/children`);
      expect(res.status).toBe(404);
    });

    it('searches by name prefix, settlements first, without coordinates', async () => {
      const res = await viewer.get('/api/v1/locations/search').query({ q: 'hyd' });
      expect(res.status).toBe(200);
      expect(res.body.data[0]).toMatchObject({ kind: 'city', name: 'Hyderabad', displayName: 'Hyderabad, Telangana' });
      expectNoCoordinates(res.body);
    });

    it('treats LIKE wildcards in search terms literally', async () => {
      const res = await viewer.get('/api/v1/locations/search').query({ q: '%%' });
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it('narrows search by kind', async () => {
      const res = await viewer.get('/api/v1/locations/search').query({ q: 'ka', kinds: 'village' });
      expect(res.body.data.map((p: any) => p.name).sort()).toEqual(['Kandi', 'Kattankulathur']);
    });

    it('validates search input', async () => {
      expect((await viewer.get('/api/v1/locations/search').query({ q: 'h' })).status).toBe(400);
      expect((await viewer.get('/api/v1/locations/search').query({ q: 'hyd', kinds: 'planet' })).status).toBe(400);
    });

    it('looks up a PIN code', async () => {
      const res = await viewer.get('/api/v1/locations/pincodes/502285');
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ areaName: 'Kandi', districtName: 'Sangareddy', stateName: 'Telangana' });
      expectNoCoordinates(res.body);
    });

    it('rejects malformed and unknown PIN codes', async () => {
      expect((await viewer.get('/api/v1/locations/pincodes/012345')).status).toBe(400);
      expect((await viewer.get('/api/v1/locations/pincodes/12345')).status).toBe(400);
      expect((await viewer.get('/api/v1/locations/pincodes/999999')).status).toBe(404);
    });
  });

  describe('Setting your area', () => {
    let member: { agent: request.Agent; id: string };

    beforeAll(async () => {
      member = await registerAgent('area@example.com', 'Area');
    });

    it('sets an area from a chosen place and shows it at city precision by default', async () => {
      const res = await member.agent.put('/api/v1/users/me/location').send({
        mode: 'place',
        placeId: await placeId('Secunderabad', 'city'),
      });
      expect(res.status).toBe(200);
      expect(res.body.data.location).toMatchObject({ source: 'place', precision: 'city', placeName: 'Secunderabad' });
      expect(res.body.data.approximateLocation).toBe('Secunderabad, Telangana');
      expectNoCoordinates(res.body);
    });

    it('widens a village to its district unless locality precision is chosen', async () => {
      const kandi = await placeId('Kandi', 'village');
      let res = await member.agent.put('/api/v1/users/me/location').send({ mode: 'place', placeId: kandi });
      expect(res.body.data.approximateLocation).toBe('Sangareddy, Telangana');

      res = await member.agent.patch('/api/v1/users/me/location').send({ precision: 'locality' });
      expect(res.status).toBe(200);
      expect(res.body.data.approximateLocation).toBe('Kandi, Sangareddy');

      res = await member.agent.patch('/api/v1/users/me/location').send({ precision: 'state' });
      expect(res.body.data.approximateLocation).toBe('Telangana');
    });

    it('rejects a whole state as an area', async () => {
      const res = await member.agent
        .put('/api/v1/users/me/location')
        .send({ mode: 'place', placeId: await placeId('Telangana', 'state') });
      expect(res.status).toBe(400);
    });

    it('rejects unknown places and malformed bodies', async () => {
      expect((await member.agent.put('/api/v1/users/me/location').send({ mode: 'place', placeId: MISSING_ID })).status).toBe(404);
      expect((await member.agent.put('/api/v1/users/me/location').send({ mode: 'teleport' })).status).toBe(400);
      expect(
        (await member.agent.put('/api/v1/users/me/location').send({ mode: 'place', placeId: MISSING_ID, latitude: 1 })).status
      ).toBe(400);
    });

    it('sets an area from a PIN code', async () => {
      const res = await member.agent.put('/api/v1/users/me/location').send({ mode: 'pincode', pincode: '560001' });
      expect(res.status).toBe(200);
      expect(res.body.data.location).toMatchObject({ source: 'pincode', pincode: '560001' });
      expect(res.body.data.approximateLocation).toBe('Bengaluru Urban, Karnataka');
    });

    it('stores only the grid cell of a device position, never the exact point', async () => {
      const exact = { latitude: 17.593612, longitude: 78.123456 };
      const res = await member.agent.put('/api/v1/users/me/location').send({ mode: 'device', ...exact });
      expect(res.status).toBe(200);
      expect(res.body.data.location).toMatchObject({ source: 'device', placeName: 'Kandi' });
      expectNoCoordinates(res.body);

      const row = await getDatabase().get('SELECT latitude, longitude FROM user_locations WHERE user_id = ?', [member.id]);
      const snapped = snapToGrid(exact);
      expect(Number(row.latitude)).toBe(snapped.latitude);
      expect(Number(row.longitude)).toBe(snapped.longitude);
      expect(Number(row.latitude)).not.toBe(exact.latitude);
    });

    it('refuses positions outside India', async () => {
      const res = await member.agent
        .put('/api/v1/users/me/location')
        .send({ mode: 'device', latitude: 51.5072, longitude: -0.1276 });
      expect(res.status).toBe(422);
    });

    it('replaces the legacy free-text location and ignores attempts to set it directly', async () => {
      await getDatabase().run('UPDATE profiles SET approximate_location = ? WHERE user_id = ?', ['Old text', member.id]);
      await member.agent.put('/api/v1/users/me/location').send({ mode: 'pincode', pincode: '500001' });
      const row = await getDatabase().get('SELECT approximate_location FROM profiles WHERE user_id = ?', [member.id]);
      expect(row.approximate_location).toBe('');

      const res = await member.agent.patch('/api/v1/users/me').send({ approximateLocation: 'Somewhere else' });
      expect(res.status).toBe(200);
      expect(res.body.data.approximateLocation).toBe('Hyderabad, Telangana');
    });

    it('clears the area', async () => {
      const res = await member.agent.delete('/api/v1/users/me/location');
      expect(res.status).toBe(200);
      expect(res.body.data.location).toBeNull();
      expect(res.body.data.approximateLocation).toBe('');
      expect((await member.agent.patch('/api/v1/users/me/location').send({ precision: 'city' })).status).toBe(404);
    });
  });

  describe('Education', () => {
    let member: request.Agent;

    beforeAll(async () => {
      ({ agent: member } = await registerAgent('student@example.com', 'Student'));
    });

    it('searches institutions by short name, name words and state on the server', async () => {
      let res = await member.get('/api/v1/education/institutions').query({ q: 'IIT' });
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(5);
      expect(res.body.data.every((i: any) => i.shortName.startsWith('IIT'))).toBe(true);

      res = await member.get('/api/v1/education/institutions').query({ q: 'techn', stateId: await placeId('Telangana', 'state') });
      expect(res.body.data.map((i: any) => i.shortName).sort()).toEqual(['IIIT Hyderabad', 'IIT Hyderabad', 'JNTUH', 'NIT Warangal']);

      res = await member.get('/api/v1/education/institutions').query({ kind: 'college', limit: 50 });
      expect(res.body.data.every((i: any) => i.kind === 'college')).toBe(true);
    });

    it('sets, shows and clears education', async () => {
      const iith = await institutionId('IIT Hyderabad');
      let res = await member.put('/api/v1/users/me/education').send({ institutionId: iith, course: 'B.Tech CSE', startYear: 2022, endYear: 2026 });
      expect(res.status).toBe(200);
      expect(res.body.data.education).toMatchObject({ institutionShortName: 'IIT Hyderabad', course: 'B.Tech CSE', startYear: 2022 });

      res = await member.delete('/api/v1/users/me/education');
      expect(res.body.data.education).toBeNull();
    });

    it('validates education input', async () => {
      const iith = await institutionId('IIT Hyderabad');
      expect((await member.put('/api/v1/users/me/education').send({ institutionId: MISSING_ID })).status).toBe(404);
      expect((await member.put('/api/v1/users/me/education').send({ institutionId: iith, startYear: 2024, endYear: 2020 })).status).toBe(400);
      expect((await member.put('/api/v1/users/me/education').send({ institutionId: iith, startYear: 2999 })).status).toBe(400);
      expect((await member.put('/api/v1/users/me/education').send({ institutionId: 'not-a-uuid' })).status).toBe(400);
    });
  });

  describe('Discovery filters', () => {
    // viewer: device position in central Hyderabad, IIT Hyderabad
    // near:   Secunderabad (~6 km), Osmania
    // kandi:  Kandi village (~45 km), IIT Hyderabad
    // blr:    Bengaluru via PIN code (~500 km)
    // nowhere: no area, no education
    let viewer: request.Agent;
    let ids: Record<'near' | 'kandi' | 'blr' | 'nowhere', string>;

    const feedIds = async (query: Record<string, unknown> = {}) => {
      const res = await viewer.get('/api/v1/discover').query(query);
      expect(res.status).toBe(200);
      return res.body.data.map((c: any) => c.id).sort();
    };

    beforeAll(async () => {
      const v = await registerAgent('viewer@example.com', 'Viewer', '1996-01-01');
      viewer = v.agent;
      await viewer.put('/api/v1/users/me/location').send({ mode: 'device', latitude: 17.385, longitude: 78.4867 });
      await viewer.put('/api/v1/users/me/education').send({ institutionId: await institutionId('IIT Hyderabad') });

      const near = await registerAgent('near@example.com', 'Near', '2000-06-01');
      await near.agent.put('/api/v1/users/me/location').send({ mode: 'place', placeId: await placeId('Secunderabad', 'city') });
      await near.agent.put('/api/v1/users/me/education').send({ institutionId: await institutionId('OU') });

      const kandi = await registerAgent('kandi@example.com', 'Kandi', '1990-06-01');
      await kandi.agent.put('/api/v1/users/me/location').send({ mode: 'place', placeId: await placeId('Kandi', 'village') });
      await kandi.agent.put('/api/v1/users/me/education').send({ institutionId: await institutionId('IIT Hyderabad') });

      const blr = await registerAgent('blr@example.com', 'Blr', '1985-06-01');
      await blr.agent.put('/api/v1/users/me/location').send({ mode: 'pincode', pincode: '560001' });

      const nowhere = await registerAgent('nowhere@example.com', 'Nowhere', '1999-06-01');

      ids = { near: near.id, kandi: kandi.id, blr: blr.id, nowhere: nowhere.id };
      // Earlier describe blocks registered other members; keep this block's assertions to its own cast.
      await getDatabase().run(`UPDATE users SET status = 'deactivated' WHERE email IN ('lookup@example.com', 'area@example.com', 'student@example.com')`);
    });

    it('returns everyone without filters, with bucketed distances only', async () => {
      const res = await viewer.get('/api/v1/discover');
      expect(res.status).toBe(200);
      const byId = new Map(res.body.data.map((c: any) => [c.id, c]));
      expect([...byId.keys()].sort()).toEqual(Object.values(ids).sort());

      const near: any = byId.get(ids.near);
      expect(near.distanceKm).toBe(10); // ~6 km → "within 10 km"
      expect(near.approximateLocation).toBe('Secunderabad, Telangana');
      expect(near.education).toEqual({ institutionName: 'Osmania University', institutionShortName: 'OU', course: '' });
      expect((byId.get(ids.nowhere) as any).distanceKm).toBeNull();
      for (const c of res.body.data) {
        if (c.distanceKm !== null) expect(c.distanceKm).toBeGreaterThanOrEqual(2);
        expect(c.location).toBeUndefined();
      }
      expectNoCoordinates(res.body);
      expect(JSON.stringify(res.body)).not.toMatch(/560001|pincode/i);
    });

    it('orders by distance when shared interests are equal', async () => {
      const res = await viewer.get('/api/v1/discover');
      const order = res.body.data.map((c: any) => c.id);
      expect(order.indexOf(ids.near)).toBeLessThan(order.indexOf(ids.kandi));
      expect(order.indexOf(ids.kandi)).toBeLessThan(order.indexOf(ids.blr));
      expect(order.indexOf(ids.blr)).toBeLessThan(order.indexOf(ids.nowhere));
    });

    it('filters by radius', async () => {
      expect(await feedIds({ radiusKm: 25 })).toEqual([ids.near]);
      expect(await feedIds({ radiusKm: 50 })).toEqual([ids.near, ids.kandi].sort());
    });

    it('only accepts the fixed radius steps', async () => {
      expect([...ALLOWED_RADII_KM]).toEqual([5, 10, 25, 50, 100, 200]);
      for (const radiusKm of [7, 0, -5, 1000, 'near']) {
        expect((await viewer.get('/api/v1/discover').query({ radiusKm })).status).toBe(400);
      }
    });

    it('requires your own area before filtering by distance', async () => {
      const nowhere = request.agent(app);
      await nowhere.post('/api/v1/auth/login').send({ email: 'nowhere@example.com', password: 'Password123!' });
      const res = await nowhere.get('/api/v1/discover').query({ radiusKm: 25 });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Set your area/);
    });

    it('filters by any level of the place hierarchy', async () => {
      expect(await feedIds({ placeId: await placeId('Telangana', 'state') })).toEqual([ids.near, ids.kandi].sort());
      expect(await feedIds({ placeId: await placeId('Hyderabad', 'district') })).toEqual([ids.near]);
      expect(await feedIds({ placeId: await placeId('Sangareddy', 'subdistrict') })).toEqual([ids.kandi]);
      expect(await feedIds({ placeId: await placeId('Kandi', 'village') })).toEqual([ids.kandi]);
      expect(await feedIds({ placeId: await placeId('Karnataka', 'state') })).toEqual([ids.blr]);
      expect(await feedIds({ placeId: MISSING_ID })).toEqual([]);
    });

    it('filters by PIN code', async () => {
      expect(await feedIds({ pincode: '560001' })).toEqual([ids.blr]);
      expect((await viewer.get('/api/v1/discover').query({ pincode: 'abc' })).status).toBe(400);
    });

    it('filters by institution', async () => {
      expect(await feedIds({ sameInstitution: 'true' })).toEqual([ids.kandi]);
      expect(await feedIds({ institutionId: await institutionId('OU') })).toEqual([ids.near]);
      const both = await viewer.get('/api/v1/discover').query({ sameInstitution: 'true', institutionId: await institutionId('OU') });
      expect(both.status).toBe(400);
    });

    it('filters by age range', async () => {
      const age = (dob: string) => {
        const d = new Date(dob);
        const now = new Date();
        return now.getUTCFullYear() - d.getUTCFullYear() - (now < new Date(Date.UTC(now.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())) ? 1 : 0);
      };
      const nearAge = age('2000-06-01');
      expect(await feedIds({ minAge: nearAge, maxAge: nearAge })).toEqual([ids.near]);
      expect(await feedIds({ minAge: age('1990-06-01') })).toEqual([ids.kandi, ids.blr].sort());
      expect(await feedIds({ maxAge: age('1999-06-01') })).toEqual([ids.near, ids.nowhere].sort());
      expect((await viewer.get('/api/v1/discover').query({ minAge: 40, maxAge: 30 })).status).toBe(400);
      expect((await viewer.get('/api/v1/discover').query({ minAge: 17 })).status).toBe(400);
    });

    it('combines filters with AND', async () => {
      expect(await feedIds({ radiusKm: 50, sameInstitution: 'true' })).toEqual([ids.kandi]);
      expect(await feedIds({ radiusKm: 25, sameInstitution: 'true' })).toEqual([]);
    });

    describe('interests', () => {
      // near: A + B, kandi: A, blr: C, nowhere: none
      const interest: Record<'A' | 'B' | 'C', string> = { A: '', B: '', C: '' };
      beforeAll(async () => {
        const all = (await viewer.get('/api/v1/users/interests')).body.data as { id: string }[];
        [interest.A, interest.B, interest.C] = all.map((i) => i.id);
        const set = async (email: string, interestIds: string[]) => {
          const agent = request.agent(app);
          await agent.post('/api/v1/auth/login').send({ email, password: 'Password123!' });
          expect((await agent.patch('/api/v1/users/me').send({ interestIds })).status).toBe(200);
        };
        await set('near@example.com', [interest.A, interest.B]);
        await set('kandi@example.com', [interest.A]);
        await set('blr@example.com', [interest.C]);
      });

      it('filters by interest on the server, matching members who share any chosen interest', async () => {
        expect(await feedIds({ interestIds: interest.B })).toEqual([ids.near]);
        expect(await feedIds({ interestIds: interest.A })).toEqual([ids.near, ids.kandi].sort());
        expect(await feedIds({ interestIds: [interest.B, interest.C].join(',') })).toEqual([ids.near, ids.blr].sort());
        // Repeated query parameters work too.
        const repeated = await viewer.get(`/api/v1/discover?interestIds=${interest.B}&interestIds=${interest.C}`);
        expect(repeated.body.data.map((c: any) => c.id).sort()).toEqual([ids.near, ids.blr].sort());
      });

      it('combines interests with distance, college and age filters', async () => {
        const first = interest.A;
        expect(await feedIds({ interestIds: first, radiusKm: 25 })).toEqual([ids.near]);
        expect(await feedIds({ interestIds: first, sameInstitution: 'true' })).toEqual([ids.kandi]);
        expect(await feedIds({ interestIds: first, minAge: 30 })).toEqual([ids.kandi]);
        expect(await feedIds({ interestIds: first, radiusKm: 25, sameInstitution: 'true' })).toEqual([]);
      });

      it('validates interest ids', async () => {
        expect((await viewer.get('/api/v1/discover').query({ interestIds: 'not-a-uuid' })).status).toBe(400);
        const eleven = Array.from({ length: 11 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`);
        expect((await viewer.get('/api/v1/discover').query({ interestIds: eleven.join(',') })).status).toBe(400);
        expect(await feedIds({ interestIds: '00000000-0000-4000-8000-000000000000' })).toEqual([]);
      });

      it('never shows suspended or deactivated members, whatever the filter', async () => {
        await getDatabase().run("UPDATE users SET status = 'suspended' WHERE id = ?", [ids.blr]);
        await getDatabase().run("UPDATE users SET status = 'deactivated' WHERE id = ?", [ids.near]);
        try {
          expect(await feedIds({ interestIds: interest.C })).toEqual([]);
          expect(await feedIds({ interestIds: interest.A })).toEqual([ids.kandi]);
          expect(await feedIds()).toEqual([ids.kandi, ids.nowhere].sort());
          expect(await feedIds({ pincode: '560001' })).toEqual([]);
        } finally {
          await getDatabase().run("UPDATE users SET status = 'active' WHERE id IN (?, ?)", [ids.blr, ids.near]);
        }
      });
    });

    it('still excludes blocked members under every filter', async () => {
      await viewer.post('/api/v1/safety/block').send({ targetUserId: ids.kandi });
      expect(await feedIds({ radiusKm: 50 })).toEqual([ids.near]);
      expect(await feedIds({ sameInstitution: 'true' })).toEqual([]);
    });
  });
});
