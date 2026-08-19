import type { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../core/errors.js';
import type { Role } from '@learnova/shared';

/** Allow only the listed roles. Use after requireAuth. */
export const requireRole =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) return next(new ForbiddenError());
    next();
  };

import { can } from '../core/capabilities.js';
/** Guard a route by capability (finer-grained than role). */
export function requireCapability(capability: string) {
  return (req: { user?: { role?: string } }, res: { status: (n: number) => { json: (b: unknown) => void } }, next: () => void) => {
    if (!req.user || !can(req.user.role, capability)) { res.status(403).json({ error: 'Not permitted for your account type' }); return; }
    next();
  };
}
