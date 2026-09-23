import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

type RequestPart = 'body' | 'query' | 'params';

/** Validates and replaces `req[part]` with the parsed value; invalid input gets a 400 with field issues. */
function validate(part: RequestPart, schema: ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      (req as any)[part] = await schema.parseAsync(req[part]);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const firstIssue = err.issues[0];
        res.status(400).json({
          success: false,
          error: firstIssue?.message || 'Invalid request data',
          issues: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
        });
        return;
      }
      next(err);
    }
  };
}

export const validateBody = (schema: ZodSchema) => validate('body', schema);
export const validateQuery = (schema: ZodSchema) => validate('query', schema);
export const validateParams = (schema: ZodSchema) => validate('params', schema);
