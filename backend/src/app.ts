import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import fs from 'fs';
import path from 'path';
import { config } from './config/env';
import { apiRateLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import { requireTrustedOrigin } from './middleware/originCheck';
import apiRouter from './routes';

/** Profile photo hosts (AVATAR_URL_HOSTS) as CSP sources: '.example.com' allows its subdomains. */
function avatarImageSources(): string[] {
  const hosts = config.avatarHosts.map((host) => (host.startsWith('.') ? `https://*${host}` : `https://${host}`));
  // Uploaded photos: only this app's own Cloudinary account (paths are CSP-matched as prefixes).
  if (config.cloudinary.cloudName) hosts.push(`https://res.cloudinary.com/${config.cloudinary.cloudName}/`);
  return hosts;
}

/** Photo uploads go from the browser straight to Cloudinary, into this app's account only. */
function uploadTargets(): string[] {
  return config.cloudinary.cloudName ? [`https://api.cloudinary.com/v1_1/${config.cloudinary.cloudName}/`] : [];
}

/**
 * Content Security Policy for the single-origin deployment (API + built frontend). Beyond 'self' it
 * allows only what the app loads: Google Identity Services (per Google's CSP guidance), Google
 * Fonts, profile photos from the allowed hosts, and photo uploads to the app's Cloudinary account.
 */
const GOOGLE_IDENTITY = 'https://accounts.google.com/gsi/';

function contentSecurityPolicy() {
  return {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      scriptSrc: ["'self'", `${GOOGLE_IDENTITY}client`],
      scriptSrcAttr: ["'none'"],
      // Vue style bindings and the Google button use inline styles.
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', `${GOOGLE_IDENTITY}style`],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:', 'blob:', ...avatarImageSources()],
      // 'self' covers the API and the same-origin realtime socket (ws/wss). The PWA service worker
      // fetches (and caches) Google Fonts itself, and its requests fall under connect-src.
      connectSrc: ["'self'", GOOGLE_IDENTITY, 'https://fonts.googleapis.com', 'https://fonts.gstatic.com', ...uploadTargets()],
      frameSrc: [GOOGLE_IDENTITY],
      workerSrc: ["'self'"],
      manifestSrc: ["'self'"],
      upgradeInsecureRequests: [],
    },
  };
}

export function createApp(): Express {
  const app = express();
  app.set('trust proxy', config.trustProxy);
  app.disable('x-powered-by');

  // Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: config.isProduction ? contentSecurityPolicy() : false,
      // Google sign-in opens a popup that must be able to report back to this window.
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    })
  );

  // gzip for API JSON and the built web app (the JS/CSS bundles shrink by ~70%).
  app.use(compression());

  // CORS
  app.use(
    cors({
      origin: config.corsOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Body parsers
  // The largest legitimate body is a 2,000-character message or a report; nothing needs more.
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: true, limit: '100kb' }));

  // General rate limiter and CSRF origin check for cookie-authenticated requests
  app.use('/api', apiRateLimiter);
  app.use('/api', requireTrustedOrigin);

  // Health check
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Base API v1
  app.use('/api/v1', apiRouter);

  // Serve built frontend assets and SPA fallback for single-service deployment
  const frontendDist = path.resolve(__dirname, '../../frontend/dist');
  if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    app.get('*', (req: Request, res: Response, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/health') || req.path.startsWith('/socket.io')) {
        return next();
      }
      res.sendFile(path.join(frontendDist, 'index.html'));
    });
  }

  // 404 handler for unmatched API routes
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: 'Resource not found',
    });
  });

  // Central Error Handler
  app.use(errorHandler);

  return app;
}
