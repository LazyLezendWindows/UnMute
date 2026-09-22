import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env';

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message = err.message || 'An unexpected error occurred';

  if (statusCode === 500) {
    console.error('[Unhandled Server Error]:', err);
  }

  res.status(statusCode).json({
    success: false,
    error: statusCode === 500 && config.env === 'production' ? 'Internal server error' : message,
    ...(config.env !== 'production' && statusCode === 500 ? { stack: err.stack } : {}),
  });
}
