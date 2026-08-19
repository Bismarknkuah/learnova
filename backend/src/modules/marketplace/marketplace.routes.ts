import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, ok } from '../../core/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { marketplaceService } from './marketplace.service.js';

export const marketplaceRoutes = Router();
marketplaceRoutes.use(requireAuth);

const searchSchema = z.object({
  type: z.string().optional(), subject: z.string().optional(),
  max: z.coerce.number().optional(), page: z.coerce.number().optional(), limit: z.coerce.number().optional(),
});
marketplaceRoutes.get('/', validate(searchSchema, 'query'), asyncHandler(async (req, res) => {
  const r = await marketplaceService.search(req.user!.tenantId, req.query as never);
  ok(res, r.items, { page: r.page, limit: r.limit, total: r.total });
}));

const createSchema = z.object({
  type: z.enum(['course', 'ebook', 'notes', 'past_questions', 'guide', 'template', 'research']),
  title: z.string().min(2), description: z.string().optional(), subject: z.string().optional(),
  priceGHS: z.number().min(0), previewUrl: z.string().url().optional(), contentUrl: z.string().url().optional(),
  coverUrl: z.string().url().optional(), isPublished: z.boolean().optional(),
});
marketplaceRoutes.post('/', requireRole('teacher', 'school_admin'), validate(createSchema), asyncHandler(async (req, res) => {
  ok(res, await marketplaceService.createProduct(req.user!.tenantId, req.user!.id, req.body), undefined, 201);
}));

marketplaceRoutes.post('/:id/purchase', asyncHandler(async (req, res) => {
  ok(res, await marketplaceService.purchase(req.user!.tenantId, req.user!.id, req.params.id), undefined, 201);
}));

marketplaceRoutes.get('/library', asyncHandler(async (req, res) => {
  ok(res, await marketplaceService.library(req.user!.tenantId, req.user!.id));
}));

marketplaceRoutes.get('/:id/download', asyncHandler(async (req, res) => {
  ok(res, await marketplaceService.download(req.user!.tenantId, req.user!.id, req.params.id));
}));
