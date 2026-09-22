import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validateBody(schema: ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.body = await schema.parseAsync(req.body);
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
