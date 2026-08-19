import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, ok } from '../../core/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { schoolService } from './school.service.js';

export const brandingRoutes = Router();
brandingRoutes.use(requireAuth);

// Any signed-in user can read their school's branding (to theme their dashboard).
brandingRoutes.get('/', asyncHandler(async (req, res) => ok(res, await schoolService.getBranding(req.user!.tenantId))));

// Only admins can change it.
brandingRoutes.patch('/', requireRole('school_admin', 'super_admin'),
  validate(z.object({ name: z.string().optional(), logoUrl: z.string().optional(), bannerUrl: z.string().optional(), primaryColor: z.string().optional(), tagline: z.string().optional(), about: z.string().optional() })),
  asyncHandler(async (req, res) => ok(res, await schoolService.updateBranding(req.user!.tenantId, req.body))));
