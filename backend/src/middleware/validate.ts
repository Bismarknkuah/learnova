import type { Request, Response, NextFunction } from 'express';
import { ZodError, type ZodSchema } from 'zod';
import { ValidationError } from '../core/errors.js';

type Part = 'body' | 'query' | 'params';

/** Validate and coerce a request part against a Zod schema; replaces it with parsed data. */
export const validate =
  (schema: ZodSchema, part: Part = 'body') =>
  (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req[part]);
      (req as Record<Part, unknown>)[part] = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return next(new ValidationError('Invalid request', err.flatten()));
      }
      next(err);
    }
  };
