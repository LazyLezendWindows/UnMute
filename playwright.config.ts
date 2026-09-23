import { defineConfig } from '@playwright/test';

/**
 * End-to-end smoke tests: a real backend on a disposable `unmute_e2e_db` (dropped and recreated
 * on every run) behind the Vite dev server. MariaDB must be running (`npm run dev:backend` starts it).
 * Uses the installed Google Chrome by default; set PW_CHANNEL= (empty) after
 * `npx playwright install chromium` to use Playwright's bundled browser instead.
 */
const API_PORT = 5100;
const WEB_PORT = 5174;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    channel: process.env.PW_CHANNEL ?? 'chrome',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'npx tsx scripts/resetDatabase.ts && npx tsx src/server.ts',
      cwd: './backend',
      url: `http://localhost:${API_PORT}/health`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        NODE_ENV: 'test',
        PORT: String(API_PORT),
        MARIADB_DATABASE: 'unmute_e2e_db',
        CORS_ORIGIN: `http://localhost:${WEB_PORT}`,
        SEED_DEMO_USERS: 'false',
      },
    },
    {
      command: `npx vite --port ${WEB_PORT} --strictPort`,
      cwd: './frontend',
      url: `http://localhost:${WEB_PORT}`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: { API_PROXY_TARGET: `http://localhost:${API_PORT}` },
    },
  ],
});
