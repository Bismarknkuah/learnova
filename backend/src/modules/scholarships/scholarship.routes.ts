import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, ok } from '../../core/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { ScholarshipModel } from './scholarship.model.js';

export const scholarshipRoutes = Router();
scholarshipRoutes.use(requireAuth);

// Active listings (deadline in the future first).
scholarshipRoutes.get('/', asyncHandler(async (req, res) => {
  const f: Record<string, unknown> = { tenantId: req.user!.tenantId };
  if (req.query.kind) f.kind = req.query.kind;
  if (req.query.fundingType) f.fundingType = req.query.fundingType;
  if (req.query.level && req.query.level !== 'Any') f.level = { $in: [req.query.level, 'Any'] };
  if (req.query.studyLocation && req.query.studyLocation !== 'Any') f.studyLocation = { $in: [req.query.studyLocation, 'Any'] };
  ok(res, await ScholarshipModel.find(f).sort({ deadline: 1 }).limit(100));
}));

const createSchema = z.object({
  kind: z.enum(['scholarship', 'grant', 'fellowship', 'internship']).default('scholarship'),
  title: z.string().min(2), sponsor: z.string().optional(), amountGHS: z.number().optional(),
  description: z.string().optional(), eligibility: z.string().optional(),
  applyUrl: z.string().url().optional(), deadline: z.coerce.date().optional(),
  level: z.enum(['KG', 'Primary', 'JHS', 'SHS', 'Undergraduate', 'Postgraduate', 'Any']).default('Any'),
  fundingType: z.enum(['full', 'partial']).default('partial'),
  studyLocation: z.enum(['Ghana', 'Abroad', 'Any']).default('Ghana'),
});
scholarshipRoutes.post('/', requireRole('teacher', 'school_admin', 'super_admin'), validate(createSchema), asyncHandler(async (req, res) => {
  const sponsorType = ['school_admin', 'super_admin'].includes(req.user!.role) ? 'school' : 'external';
  ok(res, await ScholarshipModel.create({ ...req.body, sponsorType, tenantId: req.user!.tenantId, postedBy: req.user!.id }), undefined, 201);
}));
