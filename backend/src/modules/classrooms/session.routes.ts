import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, ok } from '../../core/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { sessionService } from './session.service.js';
import { agentSystem } from '../../agents/index.js';
import { generateNotes } from './notes.js';
import { config } from '../../config/index.js';
import { ReplayNoteModel } from './replay.model.js';
import { SessionModel } from './session.model.js';

export const classroomRoutes = Router();
classroomRoutes.use(requireAuth);

classroomRoutes.get('/', asyncHandler(async (req, res) => {
  ok(res, await sessionService.list(req.user!.tenantId));
}));

const createSchema = z.object({ bookingId: z.string().optional(), title: z.string().optional(), priceGHS: z.number().min(0).max(1000).optional(), isPeer: z.boolean().optional(), subject: z.string().optional(), level: z.string().optional(), programme: z.string().optional() });
classroomRoutes.post('/', validate(createSchema), asyncHandler(async (req, res) => {
  const isStaff = ['teacher', 'school_admin', 'super_admin'].includes(req.user!.role);
  // Students may only create FREE peer classes; staff can set a price and run official classes.
  const body = isStaff ? req.body : { ...req.body, isPeer: true, priceGHS: 0 };
  ok(res, await sessionService.create(req.user!.tenantId, req.user!.id, { ...body, hostName: req.user!.name }), undefined, 201);
}));

// Returns a LiveKit URL + access token the client SDK uses to connect to the room.
classroomRoutes.post('/:id/join', asyncHandler(async (req, res) => {
  ok(res, await sessionService.join(req.user!.tenantId, req.params.id, req.user!.id, req.user!.role));
}));

classroomRoutes.post('/:id/end', requireRole('teacher'), asyncHandler(async (req, res) => {
  ok(res, await sessionService.end(req.user!.tenantId, req.params.id));
}));

// AI note generator: turn a transcript / chat log into structured class notes on demand.
const notesSchema = z.object({ title: z.string().optional(), transcript: z.string().min(10) });
classroomRoutes.post('/:id/notes', validate(notesSchema), asyncHandler(async (req, res) => {
  // Internal extractive notes — always works, no AI key required.
  const notes = generateNotes(req.body.title ?? 'Class', req.body.transcript);
  // If an AI key is configured, enrich the summary with the LLM agent.
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const ai = await agentSystem.supervisor.route('summarize_session', {
        input: { title: req.body.title ?? 'Class', transcript: req.body.transcript },
      });
      if (ai?.summary) notes.summary = ai.summary as string;
      if (Array.isArray(ai?.keyPoints) && ai.keyPoints.length) notes.keyPoints = ai.keyPoints as string[];
      if (Array.isArray(ai?.unansweredQuestions) && ai.unansweredQuestions.length) notes.unansweredQuestions = ai.unansweredQuestions as string[];
    } catch { /* fall back to internal notes */ }
  }
  ok(res, notes);
}));

// AI Class Assistant: record attendance (called when a participant joins).
classroomRoutes.post('/:id/attendance', asyncHandler(async (req, res) => {
  await SessionModel.updateOne(
    { _id: req.params.id, 'attendees.userId': { $ne: req.user!.id } },
    { $push: { attendees: { userId: req.user!.id, name: (req.body?.name as string) ?? 'Student', joinedAt: new Date(), method: (req.body?.method as string) ?? 'activity' } } },
  );
  ok(res, { recorded: true });
}));
classroomRoutes.get('/:id/attendance', requireRole('teacher', 'school_admin', 'super_admin'), asyncHandler(async (req, res) => {
  const s = await SessionModel.findById(req.params.id).select('attendees');
  ok(res, s?.attendees ?? []);
}));

// Session Replay Engine: a student's personal bookmarks + notes.
classroomRoutes.get('/:id/replay-notes', asyncHandler(async (req, res) => {
  const doc = await ReplayNoteModel.findOne({ sessionId: req.params.id, userId: req.user!.id });
  ok(res, doc ?? { bookmarks: [], notes: '' });
}));
const replaySchema = z.object({ bookmarks: z.array(z.object({ label: z.string(), atMs: z.number() })).optional(), notes: z.string().optional() });
classroomRoutes.put('/:id/replay-notes', validate(replaySchema), asyncHandler(async (req, res) => {
  const doc = await ReplayNoteModel.findOneAndUpdate(
    { tenantId: req.user!.tenantId, sessionId: req.params.id, userId: req.user!.id },
    { $set: { ...req.body } }, { upsert: true, new: true },
  );
  ok(res, doc);
}));

// Session replay: recording + transcript + AI summary + chapter markers.
classroomRoutes.get('/:id/replay', asyncHandler(async (req, res) => {
  ok(res, await sessionService.replay(req.user!.tenantId, req.params.id));
}));
