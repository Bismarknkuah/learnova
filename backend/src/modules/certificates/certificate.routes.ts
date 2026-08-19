import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, ok } from '../../core/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { certificateService } from './certificate.service.js';

export const certificateRoutes = Router();

// Public verification (no auth) — what an employer scans.
certificateRoutes.get('/verify/:code', asyncHandler(async (req, res) => {
  ok(res, await certificateService.verify(req.params.code));
}));

certificateRoutes.get('/', requireAuth, asyncHandler(async (req, res) => {
  ok(res, await certificateService.listForStudent(req.user!.tenantId, req.user!.id));
}));

const issueSchema = z.object({
  studentId: z.string(), title: z.string().min(2),
  documentUrl: z.string().url().optional(), documentContent: z.string().optional(),
});
certificateRoutes.post('/', requireAuth, requireRole('school_admin', 'super_admin'), validate(issueSchema),
  asyncHandler(async (req, res) => {
    ok(res, await certificateService.issue(req.user!.tenantId, req.user!.id, req.body), undefined, 201);
  }),
);
