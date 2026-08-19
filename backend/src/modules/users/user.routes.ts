import { Router } from 'express';
import { z } from 'zod';
import { capabilitiesFor } from '../../core/capabilities.js';
import { asyncHandler, ok } from '../../core/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { userService } from './user.service.js';

export const userRoutes = Router();
userRoutes.use(requireAuth);

userRoutes.get('/me', asyncHandler(async (req, res) => ok(res, await userService.me(req.user!.id))));

const patchSchema = z.object({
  name: z.string().min(2).optional(),
  avatarUrl: z.string().optional(),   // URL or inline data URL
  locale: z.string().optional(),
  bio: z.string().max(1000).optional(),
  educationLevel: z.enum(['KG', 'Primary', 'JHS', 'SHS', 'Undergraduate', 'Postgraduate', 'PhD', 'WASSCE', 'Tertiary', 'Other']).optional(),
  programme: z.string().optional(),
  subjects: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  interests: z.array(z.string()).optional(),
});
userRoutes.patch('/me', validate(patchSchema), asyncHandler(async (req, res) =>
  ok(res, await userService.updateProfile(req.user!.id, req.body))));

userRoutes.get('/me/capabilities', asyncHandler(async (req, res) =>
  ok(res, { role: req.user!.role, capabilities: capabilitiesFor(req.user!.role) })));

// Parent Portal
userRoutes.post('/children/:childId/link', requireRole('parent'), asyncHandler(async (req, res) =>
  ok(res, await userService.linkChild(req.user!.tenantId, req.user!.id, req.params.childId))));

userRoutes.get('/children', requireRole('parent'), asyncHandler(async (req, res) =>
  ok(res, await userService.children(req.user!.tenantId, req.user!.id))));
