import { Router } from 'express';
import { z } from 'zod';
import { ReviewModel } from './review.model.js';
import { TutorModel } from './tutor.model.js';
import { GamificationModel } from '../gamification/gamification.model.js';
import { UserModel } from '../users/user.model.js';
import { asyncHandler, ok } from '../../core/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { tutorController } from './tutor.controller.js';
import { createTutorSchema, searchTutorSchema } from './tutor.validation.js';

export const tutorRoutes = Router();

tutorRoutes.use(requireAuth);
tutorRoutes.get('/', validate(searchTutorSchema, 'query'), asyncHandler(tutorController.search));
tutorRoutes.get('/:id', asyncHandler(tutorController.get));
tutorRoutes.post('/', requireRole('teacher'), validate(createTutorSchema), asyncHandler(tutorController.create));
tutorRoutes.patch('/:id', requireRole('teacher', 'school_admin'), asyncHandler(tutorController.update));

// AI Peer-Tutor Marketplace: a high-performing student registers to tutor peers.
tutorRoutes.post('/peer-register', requireRole('student'), validate(z.object({ hourlyRateGHS: z.number().min(0).max(200), headline: z.string().optional() })), asyncHandler(async (req, res) => {
  const tenantId = req.user!.tenantId;
  const profile = await GamificationModel.findOne({ tenantId, userId: req.user!.id }).select('xp');
  const me = await UserModel.findById(req.user!.id).select('subjects name');
  const xp = profile?.xp ?? 0;
  const tutor = await TutorModel.findOneAndUpdate(
    { tenantId, userId: req.user!.id },
    { tenantId, userId: req.user!.id, isPeer: true, peerCertified: xp >= 1000,
      headline: req.body.headline ?? `Peer tutor · ${me?.name ?? 'Student'}`,
      subjects: me?.subjects ?? [], hourlyRateGHS: req.body.hourlyRateGHS,
      languages: ['English'], country: 'Ghana' },
    { upsert: true, new: true },
  );
  ok(res, { tutor, certified: xp >= 1000, xp }, undefined, 201);
}));

// ---- #12 National Teacher Verification ----
tutorRoutes.post('/verify-request', requireRole('teacher'), validate(z.object({ docType: z.enum(['ghana_card', 'passport', 'license']), docNumber: z.string().min(4) })), asyncHandler(async (req, res) => {
  const tutor = await TutorModel.findOneAndUpdate({ tenantId: req.user!.tenantId, userId: req.user!.id },
    { $set: { verification: { docType: req.body.docType, docNumber: req.body.docNumber, status: 'pending', submittedAt: new Date() } } }, { new: true });
  ok(res, tutor);
}));
tutorRoutes.get('/verifications/pending', requireRole('school_admin', 'super_admin'), asyncHandler(async (req, res) => {
  ok(res, await TutorModel.find({ tenantId: req.user!.tenantId, 'verification.status': 'pending' }).populate('userId', 'name'));
}));
tutorRoutes.patch('/:id/verify', requireRole('school_admin', 'super_admin'), validate(z.object({ approved: z.boolean() })), asyncHandler(async (req, res) => {
  const tutor = await TutorModel.findOneAndUpdate({ _id: req.params.id, tenantId: req.user!.tenantId },
    { $set: { 'verification.status': req.body.approved ? 'verified' : 'rejected', ghanaCardVerified: req.body.approved } }, { new: true });
  ok(res, tutor);
}));

// ---- #4 Teacher rating & review ----
tutorRoutes.get('/:id/reviews', asyncHandler(async (req, res) => {
  ok(res, await ReviewModel.find({ tenantId: req.user!.tenantId, tutorId: req.params.id }).sort('-createdAt').populate('studentId', 'name').limit(50));
}));
tutorRoutes.post('/:id/reviews', requireRole('student'), validate(z.object({ rating: z.number().min(1).max(5), comment: z.string().max(1000).optional() })), asyncHandler(async (req, res) => {
  const tenantId = req.user!.tenantId;
  await ReviewModel.findOneAndUpdate(
    { tenantId, tutorId: req.params.id, studentId: req.user!.id },
    { tenantId, tutorId: req.params.id, studentId: req.user!.id, rating: req.body.rating, comment: req.body.comment },
    { upsert: true },
  );
  // Recompute the tutor's aggregate rating.
  const all = await ReviewModel.find({ tenantId, tutorId: req.params.id }).select('rating');
  const avg = all.reduce((a, r) => a + r.rating, 0) / (all.length || 1);
  await TutorModel.updateOne({ _id: req.params.id }, { $set: { rating: Math.round(avg * 10) / 10, reviewsCount: all.length } });
  ok(res, { rating: Math.round(avg * 10) / 10, reviewsCount: all.length }, undefined, 201);
}));

// ---- Teacher's own profile (view + edit) ----
tutorRoutes.get('/me/profile', requireRole('teacher', 'school_admin'), asyncHandler(async (req, res) => {
  const t = await TutorModel.findOne({ tenantId: req.user!.tenantId, userId: req.user!.id });
  ok(res, t ?? null);
}));
tutorRoutes.patch('/me/profile', requireRole('teacher', 'school_admin'), validate(z.object({
  headline: z.string().max(120).optional(), bio: z.string().max(2000).optional(),
  subjects: z.array(z.string()).optional(), hourlyRateGHS: z.number().min(0).max(1000).optional(),
  teachingStyle: z.string().optional(), languages: z.array(z.string()).optional(),
  gender: z.string().optional(), country: z.string().optional(), avatarUrl: z.string().optional(),
  photos: z.array(z.string()).optional(),
})), asyncHandler(async (req, res) => {
  const t = await TutorModel.findOneAndUpdate(
    { tenantId: req.user!.tenantId, userId: req.user!.id },
    { $set: { ...req.body, tenantId: req.user!.tenantId, userId: req.user!.id } },
    { upsert: true, new: true },
  );
  // Mirror the avatar onto the user record so it shows across the app.
  if (req.body.avatarUrl) await UserModel.updateOne({ _id: req.user!.id }, { $set: { avatarUrl: req.body.avatarUrl } });
  ok(res, t);
}));
