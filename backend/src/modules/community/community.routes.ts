import { Router } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { asyncHandler, ok } from '../../core/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { MasteryModel } from '../adaptive/mastery.model.js';
import { requireRole } from '../../middleware/rbac.js';
import { GroupModel, PostModel } from './community.model.js';

export const communityRoutes = Router();
communityRoutes.use(requireAuth);

communityRoutes.get('/groups', asyncHandler(async (req, res) =>
  ok(res, await GroupModel.find({ tenantId: req.user!.tenantId }).sort({ createdAt: -1 }))));

const groupSchema = z.object({
  name: z.string().min(2), kind: z.enum(['club', 'study_group', 'research', 'forum']).default('forum'),
  description: z.string().optional(),
});
communityRoutes.post('/groups', validate(groupSchema), asyncHandler(async (req, res) =>
  ok(res, await GroupModel.create({ ...req.body, tenantId: req.user!.tenantId, createdBy: req.user!.id, memberIds: [req.user!.id] }), undefined, 201)));

communityRoutes.get('/groups/:id/posts', asyncHandler(async (req, res) =>
  ok(res, await PostModel.find({ tenantId: req.user!.tenantId, groupId: req.params.id }).sort({ createdAt: 1 }))));

const postSchema = z.object({ body: z.string().min(1), parentId: z.string().optional() });
communityRoutes.post('/groups/:id/posts', validate(postSchema), asyncHandler(async (req, res) =>
  ok(res, await PostModel.create({
    tenantId: new Types.ObjectId(req.user!.tenantId), groupId: new Types.ObjectId(req.params.id),
    authorId: new Types.ObjectId(req.user!.id), body: req.body.body, parentId: req.body.parentId,
  }), undefined, 201)));

// AI Study Group Formation: cluster students by shared weak concept (mastery < 0.6) and form groups.
communityRoutes.post('/auto-form-groups', requireRole('teacher', 'school_admin', 'super_admin'), asyncHandler(async (req, res) => {
  const tenantId = req.user!.tenantId;
  const weak = await MasteryModel.find({ tenantId, pKnown: { $lt: 0.6 } }).select('studentId concept subject pKnown');
  // Bucket weak students by concept.
  const byConcept = new Map<string, { subject?: string; students: Set<string> }>();
  for (const m of weak) {
    const key = m.concept;
    const e = byConcept.get(key) ?? { subject: m.subject ?? undefined, students: new Set<string>() };
    e.students.add(String(m.studentId));
    byConcept.set(key, e);
  }
  const formed: { concept: string; members: number }[] = [];
  for (const [concept, e] of byConcept) {
    if (e.students.size < 2) continue; // need at least 2 strugglers to form a group
    const name = `${concept} — Study Group`;
    await GroupModel.findOneAndUpdate(
      { tenantId, name },
      { tenantId, name, kind: 'study_group', createdBy: req.user!.id,
        description: `Auto-formed for students strengthening ${e.subject ?? concept}.`,
        memberIds: [...e.students] },
      { upsert: true },
    );
    formed.push({ concept, members: e.students.size });
  }
  ok(res, { formed, totalGroups: formed.length });
}));

// A student's best study-group matches: peers who share their weak concepts.
communityRoutes.get('/my-study-matches', asyncHandler(async (req, res) => {
  const tenantId = req.user!.tenantId;
  const mine = await MasteryModel.find({ tenantId, studentId: req.user!.id, pKnown: { $lt: 0.6 } }).select('concept');
  const concepts = mine.map((m) => m.concept);
  if (!concepts.length) { ok(res, { concepts: [], groups: [] }); return; }
  const groups = await GroupModel.find({ tenantId, kind: 'study_group', name: { $in: concepts.map((c) => `${c} — Study Group`) } }).select('name memberIds');
  ok(res, { concepts, groups });
}));
