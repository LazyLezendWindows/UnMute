import http from 'http';
import { createApp } from './app';
import { config } from './config/env';
import { initDatabase } from './config/database';
import { initSocketServer } from './sockets/chatSocket';
import { seedInterests, seedDemoUsersIfEmpty } from './utils/seed';

async function bootstrap() {
  try {
    // 1. Initialize database schema
    await initDatabase();

    // 2. Seed basic interests & demo data if database is fresh
    await seedInterests();
    await seedDemoUsersIfEmpty();

    // 3. Create app and HTTP server
    const app = createApp();
    const server = http.createServer(app);

    // 4. Initialize real-time Socket.io server
    initSocketServer(server);

    // 5. Start listening
    server.listen(config.port, () => {
      console.log(`[Unmute] Backend server running on http://localhost:${config.port}`);
      console.log(`[Unmute] Environment: ${config.env}`);
      console.log(`[Unmute] Base API URL: http://localhost:${config.port}/api/v1`);
    });
  } catch (err) {
    console.error('[Unmute] Failed to start server:', err);
    process.exit(1);
  }
}

bootstrap();
