import { Router } from 'express';
import { z } from 'zod';
import { generatePracticeExam } from './generator.js';
import { ExamModel } from './exam.model.js';
import { asyncHandler, ok } from '../../core/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { examService } from './exam.service.js';

export const examRoutes = Router();
examRoutes.use(requireAuth);

examRoutes.get('/', asyncHandler(async (req, res) => {
  ok(res, await examService.list(req.user!.tenantId, req.query.track as string | undefined));
}));

const createSchema = z.object({
  title: z.string().min(2),
  track: z.enum(['BECE', 'WASSCE', 'GRE', 'SAT', 'IELTS', 'TOEFL', 'custom']).default('custom'),
  subject: z.string().optional(),
  durationMin: z.number().int().positive().default(60),
  proctored: z.boolean().default(false),
  questions: z.array(z.object({
    prompt: z.string(), options: z.array(z.string()).min(2), answerIndex: z.number().int().min(0),
    topic: z.string().optional(), marks: z.number().positive().default(1),
  })).min(1),
});
examRoutes.post('/', requireRole('teacher', 'school_admin'), validate(createSchema), asyncHandler(async (req, res) => {
  ok(res, await examService.create(req.user!.tenantId, req.user!.id, req.body), undefined, 201);
}));

examRoutes.post('/:id/start', requireRole('student'), asyncHandler(async (req, res) => {
  ok(res, await examService.start(req.user!.tenantId, req.params.id, req.user!.id));
}));

const submitSchema = z.object({
  attemptId: z.string(),
  answers: z.array(z.number().int()),
  proctorEvents: z.array(z.object({
    type: z.string(), at: z.string(), severity: z.enum(['low', 'medium', 'high']),
  })).optional(),
});
examRoutes.post('/submit', requireRole('student'), validate(submitSchema), asyncHandler(async (req, res) => {
  ok(res, await examService.submit(req.user!.tenantId, req.body.attemptId, req.user!.id, req.body.answers, req.body.proctorEvents));
}));

// National Exam Prep Center: AI-generate a practice examination for a track.
examRoutes.post('/generate', validate(z.object({
  track: z.enum(['BECE', 'WASSCE', 'GRE', 'SAT', 'IELTS', 'TOEFL']),
  subject: z.string().optional(), count: z.number().min(3).max(40).optional(),
})), asyncHandler(async (req, res) => {
  const count = req.body.count ?? 10;
  const questions = await generatePracticeExam(req.body.track, req.body.subject, count);
  const exam = await ExamModel.create({
    tenantId: req.user!.tenantId, track: req.body.track, subject: req.body.subject,
    title: `${req.body.track} Practice — ${req.body.subject ?? 'Mixed'}`,
    durationMin: Math.max(15, count * 2), proctored: false, createdBy: req.user!.id, questions,
  });
  ok(res, exam, undefined, 201);
}));
