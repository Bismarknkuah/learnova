import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, ok } from '../../core/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { adminService } from './admin.service.js';

export const adminRoutes = Router();
// Every admin route requires elevated privileges.
adminRoutes.use(requireAuth, requireRole('school_admin', 'super_admin'));

adminRoutes.get('/overview', asyncHandler(async (req, res) => ok(res, await adminService.overview(req.user!))));
adminRoutes.get('/agents', asyncHandler(async (_req, res) => ok(res, adminService.agents())));
adminRoutes.get('/users', asyncHandler(async (req, res) => ok(res, await adminService.listUsers(req.user!, req.query as never))));

const statusSchema = z.object({ status: z.enum(['active', 'suspended']) });
adminRoutes.patch('/users/:id/status', validate(statusSchema), asyncHandler(async (req, res) =>
  ok(res, await adminService.setStatus(req.user!, req.params.id, req.body.status))));

const roleSchema = z.object({ role: z.enum(['student', 'teacher', 'parent', 'school_admin']) });
adminRoutes.patch('/users/:id/role', requireRole('super_admin'), validate(roleSchema), asyncHandler(async (req, res) =>
  ok(res, await adminService.setRole(req.user!, req.params.id, req.body.role))));
