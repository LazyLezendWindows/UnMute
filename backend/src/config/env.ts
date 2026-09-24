import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const env = process.env.NODE_ENV || 'development';
const isProduction = env === 'production';

const rawCors =
  process.env.CORS_ORIGIN ||
  process.env.RENDER_EXTERNAL_URL ||
  process.env.APP_URL ||
  (isProduction ? '' : 'http://localhost:5173');

const splitList = (raw: string) =>
  raw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

/**
 * Origins of the Capacitor apps (https://localhost on Android, capacitor://localhost on iOS).
 * Requests from these origins receive the session token in the response body so the app can keep
 * it in the device's secure storage and send it as a bearer token: iOS WebViews block the
 * cross-site session cookie. Empty (the default) disables native sessions entirely.
 */
const nativeAppOrigins = splitList(process.env.NATIVE_APP_ORIGINS || '');

const corsOrigins = [...new Set([...splitList(rawCors), ...nativeAppOrigins])];

if (isProduction && corsOrigins.length === 0) {
  // If no external URL configured yet, allow same-origin requests
  console.warn('[Unmute] CORS_ORIGIN not explicitly set in production; defaulting to same-origin requests.');
}

/**
 * `lax` (default) suits a web app served from the API's own site. The Capacitor app runs on its own
 * origin (https://localhost, capacitor://localhost), so it needs `none`, which browsers only accept
 * together with Secure, i.e. over HTTPS.
 */
const cookieSameSite = (process.env.SESSION_COOKIE_SAMESITE || 'lax').toLowerCase();
if (cookieSameSite !== 'lax' && cookieSameSite !== 'none') {
  throw new Error('SESSION_COOKIE_SAMESITE must be "lax" or "none"');
}

/**
 * Cloudinary (profile photo uploads): the CLOUDINARY_URL from the Cloudinary dashboard,
 * `cloudinary://<api key>:<api secret>@<cloud name>`. Empty disables uploads.
 */
function parseCloudinaryUrl(raw: string) {
  if (!raw) return { cloudName: '', apiKey: '', apiSecret: '' };
  const match = /^cloudinary:\/\/([^:@]+):([^@]+)@([a-z0-9_-]+)$/i.exec(raw.trim());
  if (!match) throw new Error('CLOUDINARY_URL must look like cloudinary://<api key>:<api secret>@<cloud name>');
  return { apiKey: decodeURIComponent(match[1]), apiSecret: decodeURIComponent(match[2]), cloudName: match[3] };
}

function positiveInt(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) throw new Error(`Expected a positive whole number, got "${raw}"`);
  return value;
}

export const config = {
  env,
  isProduction,
  port: parseInt(process.env.PORT || '5000', 10),
  /** Number of reverse-proxy hops in front of the API (so req.ip and rate limits see the real client). */
  trustProxy: parseInt(process.env.TRUST_PROXY || '0', 10),
  /** Browser origins allowed to call the API with credentials (comma-separated CORS_ORIGIN). */
  corsOrigins,
  nativeAppOrigins,
  minAge: parseInt(process.env.MIN_AGE || '18', 10),
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  /**
   * Whether new accounts may be created with an email and password. Off by default in production:
   * Unmute cannot verify those email addresses (it sends no email), while Google sign-in comes with
   * a verified one. Existing password accounts can always sign in. ALLOW_PASSWORD_SIGNUP overrides.
   */
  passwordSignup: process.env.ALLOW_PASSWORD_SIGNUP ? process.env.ALLOW_PASSWORD_SIGNUP === 'true' : !isProduction,
  /**
   * The iOS OAuth client ID, for the native app. Google may issue the iOS app's ID tokens for this
   * client instead of the web one, so it is also an accepted audience. Optional.
   */
  googleIosClientId: process.env.GOOGLE_IOS_CLIENT_ID || '',
  /**
   * Hosts profile photos may be loaded from (comma-separated; a leading dot also allows subdomains).
   * Any other URL would let a member log the IP address of everyone who views their profile.
   * Defaults to Google profile photos, which Google sign-in provides.
   */
  avatarHosts: (process.env.AVATAR_URL_HOSTS || '.googleusercontent.com')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean),
  /**
   * Web Push (notifications while the app is closed). Generate the key pair once with
   * `npx web-push generate-vapid-keys`; the subject is a contact URL or mailto: for push services.
   * Leaving the keys empty disables push notifications.
   */
  webPush: {
    publicKey: process.env.VAPID_PUBLIC_KEY || '',
    privateKey: process.env.VAPID_PRIVATE_KEY || '',
    subject: process.env.VAPID_SUBJECT || '',
    /**
     * Push services a subscription endpoint may point at. The server POSTs to the endpoint, so an
     * open list would let anyone make it send requests to arbitrary hosts (SSRF).
     */
    endpointHosts: (
      process.env.PUSH_ENDPOINT_HOSTS ||
      'fcm.googleapis.com,.push.services.mozilla.com,.push.apple.com,.notify.windows.com'
    )
      .split(',')
      .map((h) => h.trim().toLowerCase())
      .filter(Boolean),
  },
  cloudinary: parseCloudinaryUrl(process.env.CLOUDINARY_URL || ''),
  /** Chat requests: a first message to someone who has not matched with you awaits their approval. */
  chatRequests: {
    /** Length limit of the one introductory message. */
    messageMaxLength: positiveInt(process.env.CHAT_REQUEST_MESSAGE_MAX, 500),
    /** Requests a member may have awaiting an answer at once (spam control). */
    maxPending: positiveInt(process.env.CHAT_REQUEST_MAX_PENDING, 20),
    /** New requests a member may send per 24 hours. */
    perDay: positiveInt(process.env.CHAT_REQUESTS_PER_DAY, 30),
    /** After a decline, how long before the same sender may ask the same member again. */
    declineCooldownDays: positiveInt(process.env.CHAT_REQUEST_DECLINE_COOLDOWN_DAYS, 7),
  },
  /** Sensitive account actions (deletion) need a session created at most this long ago. */
  recentAuthMinutes: parseInt(process.env.RECENT_AUTH_MINUTES || '15', 10),
  session: {
    // The __Host- prefix makes browsers require Secure, Path=/ and no Domain for the cookie.
    cookieName: isProduction ? '__Host-unmute_session' : 'unmute_session',
    ttlDays: parseInt(process.env.SESSION_TTL_DAYS || '30', 10),
    sameSite: cookieSameSite as 'lax' | 'none',
    // SameSite=None cookies are rejected by browsers unless Secure.
    secure: isProduction || cookieSameSite === 'none',
  },
  /** Seed demo accounts on an empty database (never in production). */
  seedDemoUsers: !isProduction && process.env.SEED_DEMO_USERS === 'true',
  mariadb: {
    host: process.env.MARIADB_HOST || '127.0.0.1',
    port: parseInt(process.env.MARIADB_PORT || '3307', 10),
    user: process.env.MARIADB_USER || process.env.USER || '',
    password: process.env.MARIADB_PASSWORD || '',
    database: process.env.MARIADB_DATABASE || 'unmute_db',
    socketPath: process.env.MARIADB_SOCKET || path.resolve(__dirname, '../../data/mariadb.sock'),
  },
};
