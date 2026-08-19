import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, ok } from '../../core/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { inviteService } from './invite.service.js';

export const inviteRoutes = Router();

// Public: look up an invite by token so the accept page can show who/what it's for.
inviteRoutes.get('/lookup/:token', asyncHandler(async (req, res) => {
  const inv = await inviteService.byToken(req.params.token);
  ok(res, inv ? { email: inv.email, role: inv.role, valid: true } : { valid: false });
}));

// Admin-only below.
inviteRoutes.use(requireAuth, requireRole('school_admin', 'super_admin'));

const createSchema = z.object({ email: z.string().email(), role: z.enum(['teacher', 'student', 'parent', 'school_admin']) });
inviteRoutes.post('/', validate(createSchema), asyncHandler(async (req, res) =>
  ok(res, await inviteService.create(req.user!, req.body), undefined, 201)));

inviteRoutes.get('/', asyncHandler(async (req, res) => ok(res, await inviteService.list(req.user!))));
inviteRoutes.post('/:id/revoke', asyncHandler(async (req, res) => ok(res, await inviteService.revoke(req.user!, req.params.id))));
