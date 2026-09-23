import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getDatabase, IDatabase } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { calculateAge, isAtLeast18YearsOld } from '../utils/age';
import { verifyGoogleCredential } from './auth/googleIdentity';
import { RegisterInput, LoginInput, GoogleAuthInput } from '../validators/authValidator';

export type GoogleAuthResult =
  | { requiresDob: true; profile: { email: string; displayName: string; avatarUrl: string } }
  | { requiresDob: false; isNewUser: boolean; userId: string };

async function createUserWithProfile(
  tx: IDatabase,
  input: { email: string; displayName: string; dateOfBirth: string; avatarUrl?: string }
): Promise<string> {
  const userId = crypto.randomUUID();
  const now = new Date().toISOString();

  await tx.run('INSERT INTO users (id, email, is_active, created_at) VALUES (?, ?, 1, ?)', [userId, input.email, now]);
  await tx.run(
    `INSERT INTO profiles (
       id, user_id, display_name, date_of_birth, bio, approximate_location,
       avatar_url, interaction_preferences, is_verified, created_at, updated_at
     ) VALUES (?, ?, ?, ?, '', '', ?, '[]', 0, ?, ?)`,
    [crypto.randomUUID(), userId, input.displayName, input.dateOfBirth, input.avatarUrl || '', now, now]
  );
  return userId;
}

/** Password credentials are an auth account keyed by user id (provider 'password'). */
export async function addPasswordCredential(tx: IDatabase, userId: string, passwordHash: string): Promise<void> {
  const now = new Date().toISOString();
  await tx.run(
    `INSERT INTO auth_accounts (id, user_id, provider, provider_account_id, password_hash, created_at, updated_at)
     VALUES (?, ?, 'password', ?, ?, ?, ?)`,
    [crypto.randomUUID(), userId, userId, passwordHash, now, now]
  );
}

// Compared against when the email is unknown so response time does not reveal which emails exist.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('unmute-timing-equaliser', 12);

async function linkGoogleAccount(tx: IDatabase, userId: string, subject: string): Promise<void> {
  const now = new Date().toISOString();
  await tx.run(
    `INSERT INTO auth_accounts (id, user_id, provider, provider_account_id, created_at, updated_at)
     VALUES (?, ?, 'google', ?, ?, ?)`,
    [crypto.randomUUID(), userId, subject, now, now]
  );
}

export class AuthService {
  /** Registers an email/password account and returns the new user's ID. */
  static async register(input: RegisterInput): Promise<string> {
    if (!isAtLeast18YearsOld(input.dateOfBirth)) {
      throw new AppError('You must be at least 18 years of age to join Unmute', 400);
    }

    const email = input.email.toLowerCase();
    const db = getDatabase();
    const existingUser = await db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      throw new AppError('An account with this email address already exists', 409);
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    return db.transaction(async (tx) => {
      const userId = await createUserWithProfile(tx, { email, displayName: input.displayName, dateOfBirth: input.dateOfBirth });
      await addPasswordCredential(tx, userId, passwordHash);
      return userId;
    });
  }

  /** Verifies email/password credentials and returns the user's ID. */
  static async login(input: LoginInput): Promise<string> {
    const user = await getDatabase().get(
      `SELECT u.id, u.is_active, a.password_hash
       FROM users u
       LEFT JOIN auth_accounts a ON a.user_id = u.id AND a.provider = 'password'
       WHERE u.email = ?`,
      [input.email.toLowerCase()]
    );

    if (user && user.is_active && !user.password_hash) {
      throw new AppError('This account uses Google sign-in. Please continue with Google.', 400);
    }
    const passwordMatches = await bcrypt.compare(input.password, user?.password_hash || DUMMY_PASSWORD_HASH);
    if (!user || !user.is_active || !passwordMatches) {
      throw new AppError('Invalid email or password', 401);
    }
    return user.id;
  }

  /**
   * Signs in with a Google ID token. Identity comes exclusively from the verified token.
   * New users must supply a date of birth (18+); the client re-sends the same credential with it.
   */
  static async googleAuth(input: GoogleAuthInput): Promise<GoogleAuthResult> {
    const identity = await verifyGoogleCredential(input.credential);
    const db = getDatabase();

    // 1. Returning Google user, matched by the stable Google subject.
    const linked = await db.get(
      `SELECT u.id, u.is_active FROM auth_accounts a
       JOIN users u ON u.id = a.user_id
       WHERE a.provider = 'google' AND a.provider_account_id = ?`,
      [identity.subject]
    );
    if (linked) {
      if (!linked.is_active) throw new AppError('Your account has been deactivated', 403);
      return { requiresDob: false, isNewUser: false, userId: linked.id };
    }

    // Email-based linking and account creation rely on Google having verified the address.
    if (!identity.emailVerified) {
      throw new AppError('Your Google email address is not verified', 403);
    }

    // 2. Existing Unmute account with the same email: link Google to it.
    const existing = await db.get('SELECT id, is_active FROM users WHERE email = ?', [identity.email]);
    if (existing) {
      if (!existing.is_active) throw new AppError('Your account has been deactivated', 403);
      await linkGoogleAccount(db, existing.id, identity.subject);
      console.info(`[Auth] Linked Google account to existing user ${existing.id}`);
      return { requiresDob: false, isNewUser: false, userId: existing.id };
    }

    // 3. New user: the 18+ policy requires a date of birth before an account is created.
    if (!input.dateOfBirth) {
      return {
        requiresDob: true,
        profile: { email: identity.email, displayName: identity.name, avatarUrl: identity.picture },
      };
    }
    if (!isAtLeast18YearsOld(input.dateOfBirth)) {
      throw new AppError('You must be at least 18 years of age to join Unmute', 400);
    }

    const userId = await db.transaction(async (tx) => {
      const id = await createUserWithProfile(tx, {
        email: identity.email,
        displayName: (identity.name || identity.email.split('@')[0]).slice(0, 50),
        dateOfBirth: input.dateOfBirth!,
        avatarUrl: identity.picture,
      });
      await linkGoogleAccount(tx, id, identity.subject);
      return id;
    });
    console.info(`[Auth] Created account ${userId} via Google`);
    return { requiresDob: false, isNewUser: true, userId };
  }

  static async getCurrentUser(userId: string) {
    const db = getDatabase();

    const user = await db.get('SELECT id, email, is_active FROM users WHERE id = ?', [userId]);
    if (!user || !user.is_active) {
      throw new AppError('User not found or inactive', 404);
    }

    const profile = await db.get(
      `SELECT id, display_name, date_of_birth, bio, approximate_location,
              avatar_url, interaction_preferences, is_verified
       FROM profiles WHERE user_id = ?`,
      [userId]
    );

    const interests = await db.query(
      `SELECT i.id, i.name, i.category, i.icon
       FROM user_interests ui
       JOIN interests i ON ui.interest_id = i.id
       WHERE ui.user_id = ?`,
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
