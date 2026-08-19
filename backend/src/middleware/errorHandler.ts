import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../core/errors.js';
import { logger } from '../core/logger.js';
import type { ApiResponse } from '@learnova/shared';

export function notFound(req: Request, _res: Response, next: NextFunction): void {
  next(new AppError(`No route ${req.method} ${req.path}`, 404, 'NOT_FOUND'));
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const e = err instanceof AppError ? err : new AppError((err as Error)?.message ?? 'Server error');
  if (e.status >= 500) logger.error({ err: (err as Error)?.stack, correlationId: req.correlationId }, 'unhandled');
  const body: ApiResponse = { success: false, error: { code: e.code, message: e.message, details: e.details } };
  res.status(e.status).json(body);
}
