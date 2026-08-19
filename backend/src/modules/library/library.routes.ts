import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, ok } from '../../core/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { ResourceModel } from './resource.model.js';

export const libraryRoutes = Router();
libraryRoutes.use(requireAuth);

libraryRoutes.get('/', asyncHandler(async (req, res) => {
  const filter: Record<string, unknown> = { tenantId: req.user!.tenantId };
  if (req.query.type) filter.type = req.query.type;
  if (req.query.subject) filter.subject = req.query.subject;
  if (req.query.q) filter.title = new RegExp(String(req.query.q), 'i');
  ok(res, await ResourceModel.find(filter).sort({ createdAt: -1 }).limit(100));
}));

const createSchema = z.object({
  type: z.enum(['ebook', 'journal', 'notes', 'recording']), title: z.string().min(2),
  subject: z.string().optional(), author: z.string().optional(), url: z.string().url().optional(),
  tags: z.array(z.string()).optional(),
});
libraryRoutes.post('/', requireRole('teacher', 'school_admin'), validate(createSchema), asyncHandler(async (req, res) =>
  ok(res, await ResourceModel.create({ ...req.body, tenantId: req.user!.tenantId, addedBy: req.user!.id }), undefined, 201)));
