import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/env';
import { apiRateLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import apiRouter from './routes';

export function createApp(): Express {
  const app = express();

  // Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: config.env === 'production' ? undefined : false,
    })
  );

  // CORS
  app.use(
    cors({
      origin: config.corsOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Body parsers
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // General rate limiter
  app.use('/api', apiRateLimiter);

  // Health check
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Base API v1
  app.use('/api/v1', apiRouter);

  // 404 handler
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
