import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env';

export class AppError extends Error {
  statusCode: number;
  /** Optional machine-readable reason the client can act on (e.g. REAUTH_REQUIRED). */
  code?: string;
  /** Optional context the client may use (never secrets), e.g. the id of an existing request. */
  data?: Record<string, unknown>;

  constructor(message: string, statusCode = 400, code?: string, data?: Record<string, unknown>) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.data = data;
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
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      ...(err.code ? { code: err.code } : {}),
      ...(err.data ? { data: err.data } : {}),
    });
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
