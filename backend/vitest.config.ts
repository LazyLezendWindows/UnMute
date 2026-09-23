import { defineConfig } from 'vitest/config';

// Tests always run against an isolated database; never the development `unmute_db`.
const testEnv = {
  NODE_ENV: 'test',
  MARIADB_DATABASE: 'unmute_test_db',
  GOOGLE_CLIENT_ID: 'test-client-id.apps.googleusercontent.com',
  CORS_ORIGIN: 'http://localhost:5173',
};
Object.assign(process.env, testEnv);

export default defineConfig({
  test: {
    env: testEnv,
    globalSetup: ['./tests/globalSetup.ts'],
    fileParallelism: false,
  },
});
