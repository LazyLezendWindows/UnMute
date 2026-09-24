import { OAuth2Client } from 'google-auth-library';
import { config } from '../../config/env';
import { AppError } from '../../middleware/errorHandler';

export interface GoogleIdentity {
  /** Stable Google account ID (`sub`); the identifier we link accounts by. */
  subject: string;
  email: string;
  emailVerified: boolean;
  /**
   * Google is the authority for this address (gmail.com, or a Workspace domain via the `hd` claim),
   * so a verified email here proves current ownership. Other verified addresses were only checked
   * when the Google account was created, which is not enough to take over an existing account.
   */
  emailIsGoogleManaged: boolean;
  name: string;
  picture: string;
}

const client = new OAuth2Client();

const GOOGLE_ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];
const GMAIL_DOMAINS = ['gmail.com', 'googlemail.com'];

/**
 * Verifies a Google Identity Services ID token (signature, issuer, expiry and that it was issued
 * for our client ID) and returns the identity it asserts. Nothing else from the client is trusted.
 */
export async function verifyGoogleCredential(credential: string): Promise<GoogleIdentity> {
  if (!config.googleClientId) {
    throw new AppError('Google sign-in is not configured on this server', 503);
  }

  let payload;
  try {
    // The web client ID (web and Android) or, for the iOS app, its own client ID.
    const audience = [config.googleClientId, config.googleIosClientId].filter(Boolean);
    const ticket = await client.verifyIdToken({ idToken: credential, audience });
    payload = ticket.getPayload();
  } catch (err) {
    console.warn('[Auth] Google credential verification failed:', (err as Error).message);
    throw new AppError('Google sign-in could not be verified. Please try again.', 401);
  }

  // verifyIdToken already enforces the issuer; checked again so a library default change cannot widen it.
  if (!payload?.sub || !payload.email || !GOOGLE_ISSUERS.includes(payload.iss)) {
    throw new AppError('Google sign-in could not be verified. Please try again.', 401);
  }

  const email = payload.email.toLowerCase();
  const emailVerified = payload.email_verified === true;
  return {
    subject: payload.sub,
    email,
    emailVerified,
    emailIsGoogleManaged: emailVerified && (GMAIL_DOMAINS.includes(email.split('@')[1]) || Boolean(payload.hd)),
    name: payload.name || '',
    picture: payload.picture || '',
  };
}
