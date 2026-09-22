import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  jwtSecret: process.env.JWT_SECRET || 'unmute_dev_fallback_secret_must_override_in_prod',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  minAge: parseInt(process.env.MIN_AGE || '18', 10),
  jwtExpiresIn: '7d',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  snapchatClientId: process.env.SNAPCHAT_CLIENT_ID || '',
  snapchatClientSecret: process.env.SNAPCHAT_CLIENT_SECRET || '',
  instagramClientId: process.env.INSTAGRAM_CLIENT_ID || '',
  instagramClientSecret: process.env.INSTAGRAM_CLIENT_SECRET || '',
  // MariaDB configuration
  mariadb: {
    host: process.env.MARIADB_HOST || '127.0.0.1',
    port: parseInt(process.env.MARIADB_PORT || '3307', 10),
    user: process.env.MARIADB_USER || process.env.USER || 'crd-dhanush',
    password: process.env.MARIADB_PASSWORD || '',
    database: process.env.MARIADB_DATABASE || 'unmute_db',
    socketPath: process.env.MARIADB_SOCKET || path.resolve(__dirname, '../../data/mariadb.sock'),
  },
};
