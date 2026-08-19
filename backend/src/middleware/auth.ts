import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { AuthError } from '../core/errors.js';
import type { AuthUser } from '@learnova/shared';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
      correlationId?: string;
    }
  }
}

/** Verify the access token and attach req.user (id, role, tenantId). */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(new AuthError('Missing access token'));
  try {
    const claims = jwt.verify(token, config.jwt.accessSecret) as {
      sub: string; role: AuthUser['role']; tenantId: string; tenantSlug?: string;
    };
    req.user = { id: claims.sub, role: claims.role, tenantId: claims.tenantId, tenantSlug: claims.tenantSlug };
    next();
  } catch {
    next(new AuthError('Invalid or expired token'));
  }
}
