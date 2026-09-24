import http from 'http';
import { createApp } from './app';
import { config } from './config/env';
import { getDatabase, initDatabase } from './config/database';
import { initSocketServer } from './sockets/chatSocket';
import { seedInterests, seedReferenceData, seedDemoUsersIfEmpty } from './utils/seed';

const SHUTDOWN_TIMEOUT_MS = 10_000;

async function bootstrap() {
  try {
    // 1. Apply pending database migrations
    await initDatabase();

    // 2. Seed reference data; demo accounts only when explicitly enabled in development
    await seedInterests();
    await seedReferenceData();
    if (config.seedDemoUsers) {
      await seedDemoUsersIfEmpty();
    }
    if (!config.googleClientId) {
      console.warn('[Unmute] GOOGLE_CLIENT_ID is not set; Google sign-in will be unavailable.');
    }

    // 3. Create app and HTTP server
    const app = createApp();
    const server = http.createServer(app);

    // 4. Initialize real-time Socket.io server
    const io = initSocketServer(server);

    // 5. Start listening
    server.listen(config.port, () => {
      console.log(`[Unmute] Backend server running on http://localhost:${config.port}`);
      console.log(`[Unmute] Environment: ${config.env}`);
      console.log(`[Unmute] Base API URL: http://localhost:${config.port}/api/v1`);
    });

    // Deploys and restarts send SIGTERM: stop taking new connections, let in-flight requests
    // finish, tell realtime clients to reconnect (to the new instance), then close the pool.
    let shuttingDown = false;
    const shutdown = (signal: string) => {
      if (shuttingDown) return;
      shuttingDown = true;
      console.log(`[Unmute] ${signal} received; shutting down gracefully`);
      const forceExit = setTimeout(() => {
        console.error('[Unmute] Shutdown timed out; exiting');
        process.exit(1);
      }, SHUTDOWN_TIMEOUT_MS);
      forceExit.unref();
      // Disconnects every socket, then closes the HTTP server (which waits for in-flight requests).
      io.close(async () => {
        try {
          await getDatabase().close();
        } finally {
          console.log('[Unmute] Shutdown complete');
          process.exit(0);
        }
      });
      server.closeIdleConnections();
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    console.error('[Unmute] Failed to start server:', err);
    process.exit(1);
  }
}

bootstrap();
