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

// Errors raised by express.json() carry a `type` and an HTTP `status`.
const BODY_PARSER_ERRORS: Record<string, [number, string]> = {
  'entity.parse.failed': [400, 'Malformed JSON request body'],
  'entity.too.large': [413, 'Request body is too large'],
};

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ success: false, error: err.message });
    return;
  }

  const parserError = BODY_PARSER_ERRORS[(err as any).type];
  if (parserError) {
    res.status(parserError[0]).json({ success: false, error: parserError[1] });
    return;
  }

  // Unexpected: log details server-side; clients never see SQL, paths or stack traces in production.
  console.error(`[Error] ${req.method} ${req.originalUrl}:`, err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    ...(config.isProduction ? {} : { debug: err.message }),
  });
}
