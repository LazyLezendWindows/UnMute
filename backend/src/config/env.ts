import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const env = process.env.NODE_ENV || 'development';
const isProduction = env === 'production';

const corsOrigins = (process.env.CORS_ORIGIN || (isProduction ? '' : 'http://localhost:5173'))
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

if (isProduction && corsOrigins.length === 0) {
  throw new Error('CORS_ORIGIN must be set in production');
}

export const config = {
  env,
  isProduction,
  port: parseInt(process.env.PORT || '5000', 10),
  /** Number of reverse-proxy hops in front of the API (so req.ip and rate limits see the real client). */
  trustProxy: parseInt(process.env.TRUST_PROXY || '0', 10),
  /** Browser origins allowed to call the API with credentials (comma-separated CORS_ORIGIN). */
  corsOrigins,
  minAge: parseInt(process.env.MIN_AGE || '18', 10),
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  session: {
    // The __Host- prefix makes browsers require Secure, Path=/ and no Domain for the cookie.
    cookieName: isProduction ? '__Host-unmute_session' : 'unmute_session',
    ttlDays: parseInt(process.env.SESSION_TTL_DAYS || '30', 10),
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
