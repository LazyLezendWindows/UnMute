import bcrypt from 'bcryptjs';
import { getDatabase, IDatabase, isDuplicateKeyError } from '../config/database';
import { config } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import { isAtLeast18YearsOld } from '../utils/age';
import { toOwnProfile } from '../mappers/profileMapper';
import { AccountStatus, UserRepository } from '../repositories/userRepository';
import { AuthAccountRepository } from '../repositories/authAccountRepository';
import { ProfileRepository } from '../repositories/profileRepository';
import { InterestRepository } from '../repositories/interestRepository';
import { SessionRepository } from '../repositories/sessionRepository';
import { GoogleIdentity, verifyGoogleCredential } from './auth/googleIdentity';
import { RegisterInput, LoginInput, GoogleAuthInput } from '../validators/authValidator';

export type GoogleAuthResult =
  | { requiresDob: true; profile: { email: string; displayName: string; avatarUrl: string } }
  | {
      requiresDob: false;
      isNewUser: boolean;
      userId: string;
      /** Google was linked to an existing account, whose older sessions and password were revoked. */
      revokedPreviousAccess?: boolean;
    };

async function createUserWithProfile(
  tx: IDatabase,
  input: { email: string; displayName: string; dateOfBirth: string; avatarUrl?: string }
): Promise<string> {
  const userId = await UserRepository.insert(tx, input.email);
  await ProfileRepository.insert(tx, { userId, ...input });
  return userId;
}

/**
 * Lets a member with valid credentials in: a suspension (set by moderators) blocks sign-in, while a
 * self-deactivated account is reactivated by signing in again.
 */
async function admit(user: { id: string; status: AccountStatus }): Promise<void> {
  if (user.status === 'suspended') {
    throw new AppError('Your account has been suspended. Contact support if you think this is a mistake.', 403, 'ACCOUNT_SUSPENDED');
  }
  if (user.status === 'deactivated') {
    await UserRepository.setStatus(getDatabase(), user.id, 'active');
    console.info(`[Auth] Reactivated account ${user.id} on sign-in`);
  }
}

const INVALID_CREDENTIALS = 'Invalid email or password. If you joined with Google, use "Continue with Google".';

// Compared against when the email is unknown so response time does not reveal which emails exist.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('unmute-timing-equaliser', 12);

export class AuthService {
  /** Registers an email/password account and returns the new user's ID. */
  static async register(input: RegisterInput): Promise<string> {
    // Refused before looking anything up, so the answer never depends on the email.
    if (!config.passwordSignup) {
      throw new AppError('New accounts are created with Google. Use "Sign up with Google" above.', 403, 'PASSWORD_SIGNUP_DISABLED');
    }
    if (!isAtLeast18YearsOld(input.dateOfBirth)) {
      throw new AppError('You must be at least 18 years of age to join Unmute', 400);
    }

    const email = input.email.toLowerCase();
    const db = getDatabase();
    if (await UserRepository.findByEmail(email)) {
      throw new AppError('An account with this email address already exists', 409);
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    return db.transaction(async (tx) => {
      const userId = await createUserWithProfile(tx, { email, displayName: input.displayName, dateOfBirth: input.dateOfBirth });
      await AuthAccountRepository.insert(tx, { userId, provider: 'password', passwordHash });
      return userId;
    });
  }

  /**
   * Verifies email/password credentials and returns the user's ID. Unknown emails, Google-only
   * accounts and wrong passwords get the same answer after the same bcrypt work, so neither the
   * response nor its timing reveals whether (or how) an email is registered.
   */
  static async login(input: LoginInput): Promise<string> {
    const user = await AuthAccountRepository.findPasswordLogin(input.email.toLowerCase());
    const passwordMatches = await bcrypt.compare(input.password, user?.password_hash || DUMMY_PASSWORD_HASH);
    if (!user?.password_hash || !passwordMatches) {
      throw new AppError(INVALID_CREDENTIALS, 401);
    }
    // Account state is only revealed to someone who has proven they know the password.
    await admit(user);
    return user.id;
  }

  /**
   * Signs in with a Google ID token. Identity comes exclusively from the verified token.
   * New users must supply a date of birth (18+); the client re-sends the same credential with it.
   */
  static async googleAuth(input: GoogleAuthInput): Promise<GoogleAuthResult> {
    const identity = await verifyGoogleCredential(input.credential);
    try {
      return await this.resolveGoogleIdentity(identity, input.dateOfBirth);
    } catch (err) {
      // A concurrent request linked or created this identity first: sign in to that account.
      if (!isDuplicateKeyError(err)) throw err;
      const linked = await AuthAccountRepository.findUser('google', identity.subject);
      if (!linked) throw new AppError('An account with this email address already exists', 409);
      await admit(linked);
      return { requiresDob: false, isNewUser: false, userId: linked.id };
    }
  }

  private static async resolveGoogleIdentity(identity: GoogleIdentity, dateOfBirth?: string): Promise<GoogleAuthResult> {
    const db = getDatabase();

    // 1. Returning Google user, matched by the stable Google subject (never by email).
    const linked = await AuthAccountRepository.findUser('google', identity.subject);
    if (linked) {
      await admit(linked);
      return { requiresDob: false, isNewUser: false, userId: linked.id };
    }

    // Email-based linking and account creation rely on Google having verified the address.
    if (!identity.emailVerified) {
      throw new AppError('Your Google email address is not verified', 403);
    }

    // 2. Existing Unmute account with the same email.
    const existing = await UserRepository.findByEmail(identity.email);
    if (existing) {
      if (existing.status === 'suspended') await admit(existing);
      // Only link when Google is the authority for the address; otherwise the Google account may
      // merely have verified it once, long ago.
      if (!identity.emailIsGoogleManaged) {
        throw new AppError('An Unmute account already uses this email. Sign in with your email and password.', 409);
      }
      // Unmute never verified the email of a password signup, so whoever registered it may not own
      // it (pre-registration hijack). Google has now proven ownership: the password and every
      // existing session are revoked so only the proven owner keeps access.
      await db.transaction(async (tx) => {
        await AuthAccountRepository.insert(tx, { userId: existing.id, provider: 'google', providerAccountId: identity.subject });
        await AuthAccountRepository.deletePassword(tx, existing.id);
        await SessionRepository.revokeAllForUser(tx, existing.id);
      });
      await admit(existing);
      console.info(`[Auth] Linked Google account to existing user ${existing.id}; password and sessions revoked`);
      return { requiresDob: false, isNewUser: false, userId: existing.id, revokedPreviousAccess: true };
    }

    // 3. New user: the 18+ policy requires a date of birth before an account is created.
    //    Google sign-in proves the email, never the age.
    if (!dateOfBirth) {
      return {
        requiresDob: true,
        profile: { email: identity.email, displayName: identity.name, avatarUrl: identity.picture },
      };
    }
    if (!isAtLeast18YearsOld(dateOfBirth)) {
      throw new AppError('You must be at least 18 years of age to join Unmute', 400);
    }

    const userId = await db.transaction(async (tx) => {
      const id = await createUserWithProfile(tx, {
        email: identity.email,
        displayName: (identity.name || identity.email.split('@')[0]).slice(0, 50),
        dateOfBirth,
        avatarUrl: identity.picture,
      });
      await AuthAccountRepository.insert(tx, { userId: id, provider: 'google', providerAccountId: identity.subject });
      return id;
    });
    console.info(`[Auth] Created account ${userId} via Google`);
    return { requiresDob: false, isNewUser: true, userId };
  }

  static async getCurrentUser(userId: string) {
    const user = await UserRepository.findById(userId);
    if (!user || !user.is_active) {
      throw new AppError('User not found or inactive', 404);
    }
    const [profile, interests] = await Promise.all([
      ProfileRepository.findByUserId(userId),
      InterestRepository.forUser(userId),
    ]);
    return {
      id: user.id,
      email: user.email,
      profile: profile ? toOwnProfile(profile, interests) : null,
    };
  }
}
