import { Router } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { asyncHandler, ok } from '../../core/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { LabModel, LabSessionModel } from './lab.model.js';

export const labRoutes = Router();
labRoutes.use(requireAuth);

labRoutes.get('/', asyncHandler(async (req, res) => {
  const filter: Record<string, unknown> = { tenantId: req.user!.tenantId };
  if (req.query.kind) filter.kind = req.query.kind;
  ok(res, await LabModel.find(filter).sort({ createdAt: -1 }));
}));

const createLab = z.object({
  kind: z.enum(['logic_circuit', 'electronics', 'physics', 'networking', 'chemistry']),
  title: z.string().min(2), subject: z.string().optional(), brief: z.string().optional(),
  config: z.unknown().optional(),
});
labRoutes.post('/', requireRole('teacher', 'school_admin'), validate(createLab), asyncHandler(async (req, res) =>
  ok(res, await LabModel.create({ ...req.body, tenantId: req.user!.tenantId, createdBy: req.user!.id }), undefined, 201)));

// Save / submit a student's lab work.
const saveSession = z.object({ labId: z.string(), state: z.unknown(), completed: z.boolean().optional(), score: z.number().optional() });
labRoutes.post('/sessions', requireRole('student'), validate(saveSession), asyncHandler(async (req, res) => {
  const s = await LabSessionModel.findOneAndUpdate(
    { tenantId: req.user!.tenantId, labId: new Types.ObjectId(req.body.labId), studentId: new Types.ObjectId(req.user!.id) },
    { state: req.body.state, completed: req.body.completed ?? false, score: req.body.score },
    { upsert: true, new: true },
  );
  ok(res, s, undefined, 201);
}));

labRoutes.get('/sessions/:labId', requireRole('student'), asyncHandler(async (req, res) =>
  ok(res, await LabSessionModel.findOne({ tenantId: req.user!.tenantId, labId: req.params.labId, studentId: req.user!.id }))));
