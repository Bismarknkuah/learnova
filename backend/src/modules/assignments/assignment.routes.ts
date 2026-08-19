import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, ok } from '../../core/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import multer from 'multer';
import { extractText } from './extract.js';
import { reviewSubmission } from './review.js';
import { SubmissionTextModel } from './corpus.model.js';
import { assignmentService } from './assignment.service.js';
import { AssignmentTaskModel, TaskSubmissionModel } from './task.model.js';
import { llm } from '../../ai/llm.js';
import { Types } from 'mongoose';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

export const assignmentRoutes = Router();
assignmentRoutes.use(requireAuth);

const submitSchema = z.object({
  title: z.string().min(2),
  subject: z.string().optional(),
  fileUrls: z.array(z.string().url()).optional(),
  excerpt: z.string().max(8000).optional(),
});

assignmentRoutes.post('/', requireRole('student'), validate(submitSchema), asyncHandler(async (req, res) => {
  const a = await assignmentService.submit(req.user!.tenantId, req.user!.id, req.body);
  ok(res, a, undefined, 201);
}));

assignmentRoutes.get('/', asyncHandler(async (req, res) => {
  ok(res, await assignmentService.list(req.user!.tenantId, req.user!.id));
}));

assignmentRoutes.get('/:id', asyncHandler(async (req, res) => {
  ok(res, await assignmentService.get(req.user!.tenantId, req.params.id));
}));

const gradeSchema = z.object({ value: z.number().min(0).max(100) });
assignmentRoutes.post('/:id/grade', requireRole('teacher', 'school_admin'), validate(gradeSchema),
  asyncHandler(async (req, res) => {
    ok(res, await assignmentService.grade(req.user!.tenantId, req.params.id, req.user!.id, req.body.value));
  }),
);

// AI Assignment Workspace: review a submission — feedback, hints, corrections + plagiarism.
assignmentRoutes.post('/review', validate(z.object({ text: z.string().min(20), assignmentId: z.string().optional() })), asyncHandler(async (req, res) => {
  const corpus = (await SubmissionTextModel.find({ tenantId: req.user!.tenantId, userId: { $ne: req.user!.id } }).select('text').limit(200))
    .map((d) => ({ id: String(d._id), text: d.text }));
  const result = await reviewSubmission(req.body.text, corpus);
  await SubmissionTextModel.create({ tenantId: req.user!.tenantId, userId: req.user!.id, assignmentId: req.body.assignmentId, text: req.body.text });
  ok(res, result);
}));

// AI Assignment Workspace: extract text from an uploaded PDF / Word / text document.
assignmentRoutes.post('/extract', requireAuth, upload.single('file'), asyncHandler(async (req, res) => {
  const f = (req as unknown as { file?: { buffer: Buffer; mimetype: string; originalname: string } }).file;
  if (!f) { res.status(400).json({ error: 'No file uploaded' }); return; }
  const { text, kind } = await extractText(f.buffer, f.mimetype, f.originalname);
  ok(res, { text, kind, chars: text.length });
}));

// ---- Essay / free-text assignments: teacher assigns → student writes → teacher grades ----

// Teacher creates an assignment task.
assignmentRoutes.post('/tasks', requireRole('teacher', 'school_admin', 'super_admin'), validate(z.object({
  title: z.string().min(2), instructions: z.string().min(5), subject: z.string().optional(),
  level: z.string().optional(), dueDate: z.coerce.date().optional(), maxScore: z.number().positive().optional(),
})), asyncHandler(async (req, res) => {
  const task = await AssignmentTaskModel.create({ ...req.body, tenantId: req.user!.tenantId, tutorId: req.user!.id, tutorName: req.user!.name });
  ok(res, task, undefined, 201);
}));

// List tasks. Students see open tasks (with their own submission status); teachers see their tasks with counts.
assignmentRoutes.get('/tasks', asyncHandler(async (req, res) => {
  const isStaff = ['teacher', 'school_admin', 'super_admin'].includes(req.user!.role);
  if (isStaff) {
    const tasks = await AssignmentTaskModel.find({ tenantId: req.user!.tenantId, tutorId: req.user!.id }).sort('-createdAt');
    const withCounts = await Promise.all(tasks.map(async (t) => ({
      task: t,
      submissions: await TaskSubmissionModel.countDocuments({ taskId: t._id }),
      graded: await TaskSubmissionModel.countDocuments({ taskId: t._id, status: 'graded' }),
    })));
    ok(res, withCounts);
    return;
  }
  const tasks = await AssignmentTaskModel.find({ tenantId: req.user!.tenantId, status: 'open' }).sort('-createdAt');
  const mine = await TaskSubmissionModel.find({ tenantId: req.user!.tenantId, studentId: req.user!.id }).select('taskId status grade');
  const map = new Map(mine.map((m) => [String(m.taskId), m]));
  ok(res, tasks.map((t) => ({ task: t, submission: map.get(String(t._id)) ?? null })));
}));

// Student submits (or resubmits) their written answer.
assignmentRoutes.post('/tasks/:id/submit', requireRole('student'), validate(z.object({ text: z.string().min(1) })), asyncHandler(async (req, res) => {
  const task = await AssignmentTaskModel.findOne({ _id: req.params.id, tenantId: req.user!.tenantId, status: 'open' });
  if (!task) { res.status(404).json({ error: 'Assignment not found or closed' }); return; }
  const sub = await TaskSubmissionModel.findOneAndUpdate(
    { taskId: task._id, studentId: req.user!.id },
    { tenantId: req.user!.tenantId, taskId: task._id, studentId: req.user!.id, studentName: req.user!.name, text: req.body.text, status: 'submitted' },
    { upsert: true, new: true },
  );
  ok(res, sub, undefined, 201);
}));

// Teacher views all submissions for a task.
assignmentRoutes.get('/tasks/:id/submissions', requireRole('teacher', 'school_admin', 'super_admin'), asyncHandler(async (req, res) => {
  const task = await AssignmentTaskModel.findOne({ _id: req.params.id, tenantId: req.user!.tenantId });
  if (!task) { res.status(404).json({ error: 'Not found' }); return; }
  const subs = await TaskSubmissionModel.find({ taskId: task._id }).sort('-createdAt');
  ok(res, { task, submissions: subs });
}));

// Teacher grades a submission.
assignmentRoutes.post('/submissions/:id/grade', requireRole('teacher', 'school_admin', 'super_admin'), validate(z.object({
  value: z.number().min(0), feedback: z.string().optional(),
})), asyncHandler(async (req, res) => {
  const sub = await TaskSubmissionModel.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.user!.tenantId },
    { status: 'graded', grade: { value: req.body.value, feedback: req.body.feedback, gradedBy: new Types.ObjectId(req.user!.id), gradedAt: new Date() } },
    { new: true },
  );
  if (!sub) { res.status(404).json({ error: 'Submission not found' }); return; }
  ok(res, sub);
}));

// AI-suggested grade & feedback for an essay submission (teacher reviews, edits, then saves).
assignmentRoutes.post('/submissions/:id/ai-grade', requireRole('teacher', 'school_admin', 'super_admin'), asyncHandler(async (req, res) => {
  const sub = await TaskSubmissionModel.findOne({ _id: req.params.id, tenantId: req.user!.tenantId });
  if (!sub) { res.status(404).json({ error: 'Submission not found' }); return; }
  const task = await AssignmentTaskModel.findById(sub.taskId);
  const maxScore = task?.maxScore ?? 100;
  const system = `You are a fair, encouraging teacher grading a student's written assignment out of ${maxScore}. `
    + `Judge how well the answer meets the instructions: accuracy, completeness, clarity and reasoning. `
    + `Respond ONLY with strict JSON: {"score": <number 0-${maxScore}>, "feedback": "<2-3 sentences of specific, constructive feedback>"}. No other text.`;
  const user = `Assignment: ${task?.title ?? ''}\nInstructions: ${task?.instructions ?? ''}\n\nStudent's answer:\n${sub.text}`;
  const raw = await llm.complete({ system, messages: [{ role: 'user', content: user }], maxTokens: 400 });
  // Parse the model's JSON; fall back to a heuristic if it isn't clean JSON (e.g. inbuilt model).
  let suggestion = { score: Math.round(maxScore * 0.6), feedback: '' };
  try {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) { const p2 = JSON.parse(m[0]); suggestion = { score: Math.max(0, Math.min(maxScore, Number(p2.score))), feedback: String(p2.feedback ?? '') }; }
    else suggestion.feedback = raw.slice(0, 400);
  } catch { suggestion.feedback = raw.slice(0, 400); }
  ok(res, { ...suggestion, maxScore, aiPowered: !!suggestion.feedback });
}));
