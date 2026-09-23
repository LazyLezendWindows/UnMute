import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { getDatabase } from '../config/database';
import { AuthAccountRepository } from '../repositories/authAccountRepository';
import { PlaceRepository } from '../repositories/placeRepository';
import { PincodeRepository } from '../repositories/pincodeRepository';
import { InstitutionRepository } from '../repositories/institutionRepository';
import { SAMPLE_STATES, SAMPLE_SETTLEMENTS, SAMPLE_PINCODES } from './indianLocations';
import { SAMPLE_INSTITUTIONS } from './indianInstitutions';

export const DEFAULT_INTERESTS = [
  { name: 'Reading & Books', category: 'Culture', icon: 'BookOpen' },
  { name: 'Philosophy', category: 'Mind', icon: 'Brain' },
  { name: 'Indie Cinema', category: 'Cinema', icon: 'Film' },
  { name: 'Coffee Brewing', category: 'Lifestyle', icon: 'Coffee' },
  { name: 'Software & Tech', category: 'Tech', icon: 'Code' },
  { name: 'Hiking & Trails', category: 'Outdoors', icon: 'Compass' },
  { name: 'Board Games', category: 'Gaming', icon: 'Gamepad2' },
  { name: 'Analog Photography', category: 'Arts', icon: 'Camera' },
  { name: 'Writing & Poetry', category: 'Culture', icon: 'PenTool' },
  { name: 'Jazz & Lo-Fi', category: 'Music', icon: 'Music' },
  { name: 'Cooking & Recipes', category: 'Lifestyle', icon: 'Utensils' },
  { name: 'Astrophotography', category: 'Science', icon: 'Sparkles' },
  { name: 'Podcasts & Radio', category: 'Culture', icon: 'Mic' },
  { name: 'Biking & Cycling', category: 'Outdoors', icon: 'Bike' },
  { name: 'Design & UI/UX', category: 'Arts', icon: 'Palette' },
];

export async function seedInterests() {
  const db = getDatabase();
  for (const item of DEFAULT_INTERESTS) {
    const existing = await db.get('SELECT id FROM interests WHERE name = $1', [item.name]);
    if (!existing) {
      const id = crypto.randomUUID();
      await db.run(
        'INSERT INTO interests (id, name, category, icon) VALUES ($1, $2, $3, $4)',
        [id, item.name, item.category, item.icon]
      );
    }
  }
}

/**
 * Loads the bundled sample of states, districts, settlements, PIN codes and institutions.
 * Idempotent: it matches existing rows (including ones from a full LGD/AISHE import) instead of
 * duplicating them, so it is safe to run on every start.
 */
export async function seedReferenceData() {
  await getDatabase().transaction(async (tx) => {
    const stateIds = new Map<number, string>();
    for (const state of SAMPLE_STATES) {
      stateIds.set(
        state.lgd,
        await PlaceRepository.ensure(tx, {
          kind: 'state',
          name: state.name,
          parentId: null,
          stateId: null,
          districtId: null,
          lgdCode: state.lgd,
        })
      );
    }

    const districtIds = new Map<string, string>();
    const districtId = async (stateCode: number, name: string, lat: number, lng: number) => {
      const key = `${stateCode}:${name}`;
      let id = districtIds.get(key);
      if (!id) {
        const stateId = stateIds.get(stateCode)!;
        id = await PlaceRepository.ensure(tx, {
          kind: 'district',
          name,
          parentId: stateId,
          stateId,
          districtId: null,
          latitude: lat,
          longitude: lng,
        });
        districtIds.set(key, id);
      }
      return id;
    };

    for (const s of SAMPLE_SETTLEMENTS) {
      const stateId = stateIds.get(s.state)!;
      const district = await districtId(s.state, s.district, s.lat, s.lng);
      const parentId = s.subdistrict
        ? await PlaceRepository.ensure(tx, {
            kind: 'subdistrict',
            name: s.subdistrict,
            parentId: district,
            stateId,
            districtId: district,
          })
        : district;
      await PlaceRepository.ensure(tx, {
        kind: s.kind,
        name: s.name,
        parentId,
        stateId,
        districtId: district,
        latitude: s.lat,
        longitude: s.lng,
      });
    }

    for (const pin of SAMPLE_PINCODES) {
      await PincodeRepository.upsert(tx, {
        pincode: pin.pincode,
        areaName: pin.area,
        districtId: await districtId(pin.state, pin.district, pin.lat, pin.lng),
        stateId: stateIds.get(pin.state)!,
        latitude: pin.lat,
        longitude: pin.lng,
      });
    }

    for (const inst of SAMPLE_INSTITUTIONS) {
      await InstitutionRepository.ensure(tx, {
        aisheCode: null,
        name: inst.name,
        shortName: inst.shortName,
        kind: inst.kind,
        stateId: stateIds.get(inst.state)!,
        districtId: inst.district ? districtIds.get(`${inst.state}:${inst.district}`) ?? null : null,
        city: inst.city,
      });
    }
  });
}

export async function seedDemoUsersIfEmpty() {
  const db = getDatabase();
  const countRes = await db.get('SELECT COUNT(*) as count FROM users');
  const count = parseInt(countRes?.count || '0', 10);

  if (count > 0) {
    return; // Already populated
  }

  console.log('[Seed] Seeding demo connection-first profiles...');

  const demoPasswordHash = await bcrypt.hash('UnmutePassword123!', 10);
  const now = new Date().toISOString();

  const demoUsers = [
    {
      email: 'aanya.sharma@example.com',
      displayName: 'Aanya',
      dob: '1998-04-12',
      bio: 'Lover of quiet corners, dark roast coffee, and debating whether digital books can ever match the smell of yellowed paperbacks. Always up for late-night deep talks.',
      location: 'Hyderabad',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
      preferences: ['Deep conversations', 'Book/Movie discussions', 'Coffee Brewing'],
      interests: ['Reading & Books', 'Coffee Brewing', 'Philosophy', 'Writing & Poetry'],
    },
    {
      email: 'rohit.verma@example.com',
      displayName: 'Rohit',
      dob: '1996-09-28',
      bio: 'Systems engineer by day, indie film nerd and amateur astrophotographer by night. If you love discussing Denis Villeneuve films or space anomalies, say hi!',
      location: 'Bengaluru',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
      preferences: ['Coding & Tech talk', 'Book/Movie discussions', 'Shared hobbies'],
      interests: ['Indie Cinema', 'Software & Tech', 'Astrophotography', 'Podcasts & Radio'],
    },
    {
      email: 'meera.iyer@example.com',
      displayName: 'Meera',
      dob: '2000-02-15',
      bio: 'Architectural designer capturing quiet city textures on 35mm film. Big believer that conversations without pretense are the best kind of art.',
      location: 'Mumbai',
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
      preferences: ['Creative collaboration', 'Deep conversations', 'Philosophy & Ideas'],
      interests: ['Analog Photography', 'Design & UI/UX', 'Jazz & Lo-Fi', 'Coffee Brewing'],
    },
    {
      email: 'kabir.patel@example.com',
      displayName: 'Kabir',
      dob: '1995-11-04',
      bio: 'Exploring mountain trails on weekends, baking sourdough experiments on weekdays. No pressure, just honest conversation and good vibes.',
      location: 'Secunderabad',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
      preferences: ['Casual chats', 'Shared hobbies'],
      interests: ['Hiking & Trails', 'Cooking & Recipes', 'Biking & Cycling', 'Board Games'],
    },
    {
      email: 'priya.nair@example.com',
      displayName: 'Priya',
      dob: '1999-07-21',
      bio: 'Folk music enthusiast and podcast hoarder. Constantly searching for the coziest rainy evening playlists and meaningful chats.',
      location: 'Bengaluru',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
      preferences: ['Deep conversations', 'Language exchange', 'Book/Movie discussions'],
      interests: ['Jazz & Lo-Fi', 'Podcasts & Radio', 'Reading & Books', 'Philosophy'],
    },
  ];

  for (const demo of demoUsers) {
    const userId = crypto.randomUUID();
    const profileId = crypto.randomUUID();

    await db.run('INSERT INTO users (id, email, is_active, created_at) VALUES ($1, $2, 1, $3)', [userId, demo.email, now]);
    await AuthAccountRepository.insert(db, { userId, provider: 'password', passwordHash: demoPasswordHash });

    await db.run(
      `INSERT INTO profiles (
        id, user_id, display_name, date_of_birth, bio, approximate_location,
        avatar_url, interaction_preferences, is_verified, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1, $9, $9)`,
      [
        profileId,
        userId,
        demo.displayName,
        demo.dob,
        demo.bio,
        demo.location,
        demo.avatarUrl,
        JSON.stringify(demo.preferences),
        now,
      ]
    );

    // Structured area (a sample city), shown to others at city precision
    const city = await db.get<{ id: string; latitude: string; longitude: string }>(
      `SELECT id, latitude, longitude FROM places WHERE kind = 'city' AND name = $1 LIMIT 1`,
      [demo.location]
    );
    if (city) {
      await db.run(
        `INSERT INTO user_locations (user_id, place_id, latitude, longitude, source, label_precision)
         VALUES ($1, $2, $3, $4, 'place', 'city')`,
        [userId, city.id, city.latitude, city.longitude]
      );
    }

    // Link interests
    for (const intName of demo.interests) {
      const intRow = await db.get('SELECT id FROM interests WHERE name = $1', [intName]);
      if (intRow) {
        await db.run(
          'INSERT INTO user_interests (user_id, interest_id) VALUES ($1, $2)',
          [userId, intRow.id]
        );
      }
    }
  }

  console.log('[Seed] Demo users seeded successfully.');
}
