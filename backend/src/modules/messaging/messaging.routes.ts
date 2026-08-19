import { Router } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { asyncHandler, ok } from '../../core/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { ConversationModel, MessageModel } from './messaging.model.js';
import { UserModel } from '../users/user.model.js';
import { getIO } from '../../realtime.js';

export const messagingRoutes = Router();
messagingRoutes.use(requireAuth);

// People you can message (within your school).
messagingRoutes.get('/contacts', asyncHandler(async (req, res) => {
  const q = String(req.query.q ?? '');
  const filter: Record<string, unknown> = { tenantId: req.user!.tenantId, _id: { $ne: req.user!.id }, deletedAt: null };
  if (q) filter.name = new RegExp(q, 'i');
  ok(res, await UserModel.find(filter).select('name role').limit(20));
}));

// My conversations, newest first, with the other participant resolved.
messagingRoutes.get('/conversations', asyncHandler(async (req, res) => {
  const convos = await ConversationModel.find({ tenantId: req.user!.tenantId, participantIds: req.user!.id })
    .sort('-lastAt').populate('participantIds', 'name role').limit(50);
  ok(res, convos.map((c) => ({
    _id: c._id, lastMessage: c.lastMessage, lastAt: c.lastAt,
    other: (c.participantIds as unknown as { _id: string; name?: string; role?: string }[]).find((p) => String(p._id) !== req.user!.id),
  })));
}));

// Start (or fetch) a conversation with a user.
messagingRoutes.post('/conversations', validate(z.object({ userId: z.string() })), asyncHandler(async (req, res) => {
  const tenantId = new Types.ObjectId(req.user!.tenantId);
  const me = new Types.ObjectId(req.user!.id); const them = new Types.ObjectId(req.body.userId);
  let convo = await ConversationModel.findOne({ tenantId, participantIds: { $all: [me, them], $size: 2 } });
  if (!convo) convo = await ConversationModel.create({ tenantId, participantIds: [me, them] });
  ok(res, convo, undefined, 201);
}));

messagingRoutes.get('/conversations/:id/messages', asyncHandler(async (req, res) => {
  const msgs = await MessageModel.find({ tenantId: req.user!.tenantId, conversationId: req.params.id }).sort('createdAt').limit(200);
  await MessageModel.updateMany({ conversationId: req.params.id, fromId: { $ne: req.user!.id }, readAt: null }, { $set: { readAt: new Date() } });
  ok(res, msgs);
}));

messagingRoutes.post('/conversations/:id/messages', validate(z.object({ body: z.string().min(1) })), asyncHandler(async (req, res) => {
  const tenantId = new Types.ObjectId(req.user!.tenantId);
  const convo = await ConversationModel.findOne({ _id: req.params.id, tenantId, participantIds: req.user!.id });
  if (!convo) { res.status(404).json({ error: 'Conversation not found' }); return; }
  const msg = await MessageModel.create({ tenantId, conversationId: convo._id, fromId: new Types.ObjectId(req.user!.id), body: req.body.body });
  convo.lastMessage = req.body.body; convo.lastAt = new Date(); await convo.save();
  // Real-time push to the other participant(s).
  const io = getIO();
  if (io) for (const pid of convo.participantIds) if (String(pid) !== req.user!.id) io.to(`user:${pid}`).emit('dm:new', { conversationId: String(convo._id), message: msg });
  ok(res, msg, undefined, 201);
}));
