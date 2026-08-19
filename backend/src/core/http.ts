import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { ApiResponse } from '@learnova/shared';

/** Wrap async route handlers so thrown errors reach the error middleware. */
export const asyncHandler =
  (fn: RequestHandler): RequestHandler =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);

/** Uniform success envelope. */
export function ok<T>(res: Response, data: T, meta?: ApiResponse<T>['meta'], status = 200): void {
  const body: ApiResponse<T> = { success: true, data, meta };
  res.status(status).json(body);
}
