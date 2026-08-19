import { Router } from 'express';
import { asyncHandler, ok } from '../../core/http.js';
import { ForbiddenError } from '../../core/errors.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { UserModel } from '../users/user.model.js';
import { ResultModel, FeeInvoiceModel } from './school.models.js';
import { SessionModel } from '../classrooms/session.model.js';

export const parentRoutes = Router();
parentRoutes.use(requireAuth, requireRole('parent'));

/** Ensure the requested child actually belongs to this parent. */
async function assertGuardian(parentId: string, childId: string) {
  const child = await UserModel.findOne({ _id: childId, guardianId: parentId }).select('name');
  if (!child) throw new ForbiddenError('Not your child');
  return child;
}

parentRoutes.get('/child/:childId/results', asyncHandler(async (req, res) => {
  await assertGuardian(req.user!.id, req.params.childId);
  ok(res, await ResultModel.find({ studentId: req.params.childId }).sort('-createdAt'));
}));
parentRoutes.get('/child/:childId/fees', asyncHandler(async (req, res) => {
  await assertGuardian(req.user!.id, req.params.childId);
  ok(res, await FeeInvoiceModel.find({ studentId: req.params.childId }).sort('-createdAt'));
}));
parentRoutes.get('/child/:childId/attendance', asyncHandler(async (req, res) => {
  await assertGuardian(req.user!.id, req.params.childId);
  const sessions = await SessionModel.find({ 'attendees.userId': req.params.childId }).select('title startedAt attendees').sort('-createdAt').limit(50);
  ok(res, sessions.map((s) => ({ title: s.get('title'), at: s.get('startedAt') ?? s.get('createdAt') })));
}));
