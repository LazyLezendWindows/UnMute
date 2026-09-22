import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getDatabase } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { calculateAge, isAtLeast18YearsOld } from '../utils/age';
import { generateToken } from '../utils/token';
import { RegisterInput, LoginInput, GoogleAuthInput } from '../validators/authValidator';

export class AuthService {
  static async register(input: RegisterInput) {
    const db = getDatabase();

    // Enforce 18+ server-side
    if (!isAtLeast18YearsOld(input.dateOfBirth)) {
      throw new AppError('You must be at least 18 years of age to join Unmute', 400);
    }

    // Check if email already exists
    const existingUser = await db.get(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      [input.email]
    );
    if (existingUser) {
      throw new AppError('An account with this email address already exists', 409);
    }

    const userId = crypto.randomUUID();
    const profileId = crypto.randomUUID();
    const now = new Date().toISOString();
    const passwordHash = await bcrypt.hash(input.password, 12);

    // Create user
    await db.run(
      'INSERT INTO users (id, email, password_hash, is_active, created_at) VALUES ($1, $2, $3, 1, $4)',
      [userId, input.email.toLowerCase(), passwordHash, now]
    );

    // Create default profile
    await db.run(
      `INSERT INTO profiles (
        id, user_id, display_name, date_of_birth, bio, approximate_location,
        avatar_url, interaction_preferences, is_verified, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, '', '', '', '[]', 0, $5, $5)`,
      [profileId, userId, input.displayName, input.dateOfBirth, now]
    );

    const token = generateToken({ userId, email: input.email.toLowerCase() });

    return {
      token,
      user: {
        id: userId,
        email: input.email.toLowerCase(),
        profile: {
          id: profileId,
          displayName: input.displayName,
          dateOfBirth: input.dateOfBirth,
          age: calculateAge(input.dateOfBirth),
          bio: '',
          approximateLocation: '',
          avatarUrl: '',
          interactionPreferences: [],
          interests: [],
          isVerified: false,
        },
      },
    };
  }

  static async login(input: LoginInput) {
    const db = getDatabase();

    const user = await db.get(
      'SELECT id, email, password_hash, is_active FROM users WHERE LOWER(email) = LOWER($1)',
      [input.email]
    );

    if (!user || !user.is_active) {
      throw new AppError('Invalid email or password', 401);
    }

    if (!user.password_hash) {
      throw new AppError('This account was created using Google. Please sign in with Google.', 400);
    }

    const isValid = await bcrypt.compare(input.password, user.password_hash);
    if (!isValid) {
      throw new AppError('Invalid email or password', 401);
    }

    const profile = await db.get(
      `SELECT id, display_name, date_of_birth, bio, approximate_location,
              avatar_url, interaction_preferences, is_verified
       FROM profiles WHERE user_id = $1`,
      [user.id]
    );

    const interests = await db.query(
      `SELECT i.id, i.name, i.category, i.icon
       FROM user_interests ui
       JOIN interests i ON ui.interest_id = i.id
       WHERE ui.user_id = $1`,
      [user.id]
    );

    const token = generateToken({ userId: user.id, email: user.email });

    let interactionPrefs = [];
    try {
      interactionPrefs = JSON.parse(profile?.interaction_preferences || '[]');
    } catch {
      interactionPrefs = [];
    }

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        profile: profile
          ? {
              id: profile.id,
              displayName: profile.display_name,
              dateOfBirth: profile.date_of_birth,
              age: calculateAge(profile.date_of_birth),
              bio: profile.bio || '',
              approximateLocation: profile.approximate_location || '',
              avatarUrl: profile.avatar_url || '',
              interactionPreferences: interactionPrefs,
              interests,
              isVerified: Boolean(profile.is_verified),
            }
          : null,
      },
    };
  }

  static async googleAuth(input: GoogleAuthInput) {
    const db = getDatabase();

    let googleId = input.googleId;
    let email = input.email;
    let displayName = input.displayName;
    let avatarUrl = input.avatarUrl;

    // Decode Google JWT credential if provided
    if (input.credential && input.credential.includes('.')) {
      try {
        const parts = input.credential.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
          googleId = payload.sub || googleId;
          email = payload.email || email;
          displayName = payload.name || displayName;
          avatarUrl = payload.picture || avatarUrl;
        }
      } catch (e) {
        console.warn('[GoogleAuth] Failed to parse credential payload:', e);
      }
    }

    if (!email) {
      throw new AppError('Email is required for Google authentication', 400);
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Check if user exists by google_id or by email
    let user = null;
    if (googleId) {
      user = await db.get(
        'SELECT id, email, google_id, is_active FROM users WHERE google_id = $1',
        [googleId]
      );
    }

    if (!user) {
      user = await db.get(
        'SELECT id, email, google_id, is_active FROM users WHERE LOWER(email) = $1',
        [normalizedEmail]
      );
    }

    // 2. If user exists: link google_id if needed, and log in
    if (user) {
      if (!user.is_active) {
        throw new AppError('Your account has been deactivated', 403);
      }

      if (googleId && !user.google_id) {
        await db.run('UPDATE users SET google_id = $1 WHERE id = $2', [googleId, user.id]);
      }

      const profile = await db.get(
        `SELECT id, display_name, date_of_birth, bio, approximate_location,
                avatar_url, interaction_preferences, is_verified
         FROM profiles WHERE user_id = $1`,
        [user.id]
      );

      const interests = await db.query(
        `SELECT i.id, i.name, i.category, i.icon
         FROM user_interests ui
         JOIN interests i ON ui.interest_id = i.id
         WHERE ui.user_id = $1`,
        [user.id]
      );

      let interactionPrefs = [];
      try {
        interactionPrefs = JSON.parse(profile?.interaction_preferences || '[]');
      } catch {
        interactionPrefs = [];
      }

      const token = generateToken({ userId: user.id, email: user.email });

      return {
        token,
        isNewUser: false,
        user: {
          id: user.id,
          email: user.email,
          profile: profile
            ? {
                id: profile.id,
                displayName: profile.display_name,
                dateOfBirth: profile.date_of_birth,
                age: calculateAge(profile.date_of_birth),
                bio: profile.bio || '',
                approximateLocation: profile.approximate_location || '',
                avatarUrl: profile.avatar_url || avatarUrl || '',
                interactionPreferences: interactionPrefs,
                interests,
                isVerified: Boolean(profile.is_verified),
              }
            : null,
        },
      };
    }

    // 3. New User Registration via Google:
    // Check Date of Birth for 18+ policy enforcement
    if (!input.dateOfBirth) {
      return {
        requiresDob: true,
        email: normalizedEmail,
        googleId: googleId || '',
        displayName: displayName || 'New Member',
        avatarUrl: avatarUrl || '',
      };
    }

    if (!isAtLeast18YearsOld(input.dateOfBirth)) {
      throw new AppError('You must be at least 18 years of age to join Unmute', 400);
    }

    const userId = crypto.randomUUID();
    const profileId = crypto.randomUUID();
    const now = new Date().toISOString();
    const cleanName = displayName || normalizedEmail.split('@')[0];

    // Create user with nullable password and google_id
    await db.run(
      'INSERT INTO users (id, email, google_id, password_hash, is_active, created_at) VALUES ($1, $2, $3, NULL, 1, $4)',
      [userId, normalizedEmail, googleId || null, now]
    );

    // Create verified profile
    await db.run(
      `INSERT INTO profiles (
        id, user_id, display_name, date_of_birth, bio, approximate_location,
        avatar_url, interaction_preferences, is_verified, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, '', '', $5, '[]', 1, $6, $6)`,
      [profileId, userId, cleanName, input.dateOfBirth, avatarUrl || '', now]
    );

    const token = generateToken({ userId, email: normalizedEmail });

    return {
      token,
      isNewUser: true,
      user: {
        id: userId,
        email: normalizedEmail,
        profile: {
          id: profileId,
          displayName: cleanName,
          dateOfBirth: input.dateOfBirth,
          age: calculateAge(input.dateOfBirth),
          bio: '',
          approximateLocation: '',
          avatarUrl: avatarUrl || '',
          interactionPreferences: [],
          interests: [],
          isVerified: true,
        },
      },
    };
  }

  static async getCurrentUser(userId: string) {
    const db = getDatabase();

    const user = await db.get('SELECT id, email, is_active FROM users WHERE id = $1', [userId]);
    if (!user || !user.is_active) {
      throw new AppError('User not found or inactive', 404);
    }

    const profile = await db.get(
      `SELECT id, display_name, date_of_birth, bio, approximate_location,
              avatar_url, interaction_preferences, is_verified
       FROM profiles WHERE user_id = $1`,
      [userId]
    );

    const interests = await db.query(
      `SELECT i.id, i.name, i.category, i.icon
       FROM user_interests ui
       JOIN interests i ON ui.interest_id = i.id
       WHERE ui.user_id = $1`,
      [userId]
    );

    let interactionPrefs = [];
    try {
      interactionPrefs = JSON.parse(profile?.interaction_preferences || '[]');
    } catch {
      interactionPrefs = [];
    }

    return {
      id: user.id,
      email: user.email,
      profile: profile
        ? {
            id: profile.id,
            displayName: profile.display_name,
            dateOfBirth: profile.date_of_birth,
            age: calculateAge(profile.date_of_birth),
            bio: profile.bio || '',
            approximateLocation: profile.approximate_location || '',
            avatarUrl: profile.avatar_url || '',
            interactionPreferences: interactionPrefs,
            interests,
            isVerified: Boolean(profile.is_verified),
          }
        : null,
    };
  }
}
