import { OAuth2Client } from 'google-auth-library';
import { config } from '../../config/env';
import { AppError } from '../../middleware/errorHandler';

export interface GoogleIdentity {
  /** Stable Google account ID (`sub`); the identifier we link accounts by. */
  subject: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture: string;
}

const client = new OAuth2Client();

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
    const ticket = await client.verifyIdToken({ idToken: credential, audience: config.googleClientId });
    payload = ticket.getPayload();
  } catch (err) {
    console.warn('[Auth] Google credential verification failed:', (err as Error).message);
    throw new AppError('Google sign-in could not be verified. Please try again.', 401);
  }

  if (!payload?.sub || !payload.email) {
    throw new AppError('Google sign-in could not be verified. Please try again.', 401);
  }

  return {
    subject: payload.sub,
    email: payload.email.toLowerCase(),
    emailVerified: payload.email_verified === true,
    name: payload.name || '',
    picture: payload.picture || '',
  };
}
