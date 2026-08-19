import { Router } from 'express';
import { asyncHandler, ok } from '../../core/http.js';
import { z } from 'zod';
import { Types } from 'mongoose';
import { TutorRequestModel } from './request.model.js';
import { BookingModel } from './booking.model.js';
import { TutorModel } from '../tutors/tutor.model.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { bookingController } from './booking.controller.js';
import { createBookingSchema } from './booking.validation.js';

export const bookingRoutes = Router();
bookingRoutes.use(requireAuth);
bookingRoutes.get('/suggest', asyncHandler(bookingController.suggest));
bookingRoutes.get('/', asyncHandler(bookingController.list));
bookingRoutes.post('/', requireRole('student'), validate(createBookingSchema), asyncHandler(bookingController.create));

// ---- Open tutor-requests: student posts (exact time + budget), tutors apply ----
bookingRoutes.post('/requests', requireRole('student'), validate(z.object({
  subject: z.string().min(2), description: z.string().optional(), level: z.string().optional(),
  preferredAt: z.coerce.date().optional(), durationMin: z.number().int().positive().optional(), budgetGHS: z.number().min(0).optional(),
})), asyncHandler(async (req, res) => {
  const r = await TutorRequestModel.create({ ...req.body, tenantId: req.user!.tenantId, studentId: req.user!.id, studentName: req.user!.name });
  ok(res, r, undefined, 201);
}));

bookingRoutes.get('/requests', asyncHandler(async (req, res) => {
  const isTutor = ['teacher', 'school_admin', 'super_admin'].includes(req.user!.role);
  if (isTutor) { ok(res, await TutorRequestModel.find({ tenantId: req.user!.tenantId, status: 'open' }).sort('-createdAt').limit(100)); return; }
  ok(res, await TutorRequestModel.find({ tenantId: req.user!.tenantId, studentId: req.user!.id }).sort('-createdAt'));
}));

bookingRoutes.post('/requests/:id/apply', requireRole('teacher', 'school_admin', 'super_admin'), validate(z.object({
  message: z.string().optional(), rateGHS: z.number().min(0).optional(),
})), asyncHandler(async (req, res) => {
  const r = await TutorRequestModel.findOne({ _id: req.params.id, tenantId: req.user!.tenantId, status: 'open' });
  if (!r) { res.status(404).json({ error: 'Request not available' }); return; }
  if (r.applicants.some((a) => String(a.tutorId) === req.user!.id)) { res.status(409).json({ error: 'Already applied' }); return; }
  r.applicants.push({ tutorId: new Types.ObjectId(req.user!.id), tutorName: req.user!.name, message: req.body.message, rateGHS: req.body.rateGHS, appliedAt: new Date() });
  await r.save();
  ok(res, { applied: true });
}));

bookingRoutes.post('/requests/:id/accept', requireRole('student'), validate(z.object({ tutorId: z.string() })), asyncHandler(async (req, res) => {
  const r = await TutorRequestModel.findOne({ _id: req.params.id, tenantId: req.user!.tenantId, studentId: req.user!.id, status: 'open' });
  if (!r) { res.status(404).json({ error: 'Request not found or already matched' }); return; }
  const chosen = r.applicants.find((a) => String(a.tutorId) === req.body.tutorId);
  if (!chosen) { res.status(400).json({ error: 'That tutor did not apply to this request' }); return; }

  // Map the accepted teacher (a User) to their Tutor profile, creating a minimal one if needed.
  let tutor = await TutorModel.findOne({ tenantId: req.user!.tenantId, userId: chosen.tutorId });
  if (!tutor) tutor = await TutorModel.create({ tenantId: req.user!.tenantId, userId: chosen.tutorId, headline: chosen.tutorName, hourlyRateGHS: chosen.rateGHS ?? r.budgetGHS ?? 0 });

  const start = r.preferredAt ?? new Date(Date.now() + 864e5); // default: tomorrow if unspecified
  const end = new Date(new Date(start).getTime() + (r.durationMin ?? 60) * 60000);
  const priceGHS = chosen.rateGHS ?? r.budgetGHS ?? 0;

  // Auto-create the booking. Free sessions are confirmed immediately; paid ones await payment.
  const booking = await BookingModel.create({
    tenantId: req.user!.tenantId, studentId: req.user!.id, tutorId: tutor._id,
    type: 'one_on_one', startAt: start, endAt: end, priceGHS,
    status: priceGHS > 0 ? 'pending_payment' : 'confirmed',
  });

  r.status = 'matched'; r.acceptedTutorId = new Types.ObjectId(req.body.tutorId); await r.save();
  ok(res, { request: r, booking, needsPayment: priceGHS > 0 }, undefined, 201);
}));
