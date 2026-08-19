import { Router } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { asyncHandler, ok } from '../../core/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { FeedPostModel, FeedCommentModel } from './feed.model.js';

export const feedRoutes = Router();
feedRoutes.use(requireAuth);

// Feed (newest first), with author names and whether the viewer liked each post.
feedRoutes.get('/', asyncHandler(async (req, res) => {
  const tenantId = req.user!.tenantId;
  const posts = await FeedPostModel.find({ tenantId }).sort('-createdAt').limit(50).populate('authorId', 'name role');
  ok(res, posts.map((p) => ({
    _id: p._id, kind: p.kind, body: p.body, link: p.link, tags: p.tags,
    author: p.get('authorId'), imageUrl: p.imageUrl, likes: p.likes.length, commentCount: p.commentCount,
    likedByMe: p.likes.some((u) => String(u) === req.user!.id), createdAt: p.get('createdAt'),
  })));
}));

const postSchema = z.object({ body: z.string().min(1), kind: z.enum(['post', 'research', 'question', 'achievement']).optional(), link: z.string().optional(), imageUrl: z.string().optional(), tags: z.array(z.string()).optional() });
feedRoutes.post('/', validate(postSchema), asyncHandler(async (req, res) => {
  const post = await FeedPostModel.create({ tenantId: new Types.ObjectId(req.user!.tenantId), authorId: new Types.ObjectId(req.user!.id), ...req.body });
  ok(res, post, undefined, 201);
}));

feedRoutes.post('/:id/like', asyncHandler(async (req, res) => {
  const post = await FeedPostModel.findOne({ _id: req.params.id, tenantId: req.user!.tenantId });
  if (!post) { res.status(404).json({ error: 'Not found' }); return; }
  const uid = req.user!.id;
  const liked = post.likes.some((u) => String(u) === uid);
  await FeedPostModel.updateOne({ _id: post._id }, liked ? { $pull: { likes: uid } } : { $addToSet: { likes: uid } });
  ok(res, { liked: !liked });
}));

feedRoutes.get('/:id/comments', asyncHandler(async (req, res) => {
  ok(res, await FeedCommentModel.find({ tenantId: req.user!.tenantId, postId: req.params.id }).sort('createdAt').populate('authorId', 'name'));
}));
feedRoutes.post('/:id/comments', validate(z.object({ body: z.string().min(1) })), asyncHandler(async (req, res) => {
  const comment = await FeedCommentModel.create({ tenantId: new Types.ObjectId(req.user!.tenantId), postId: new Types.ObjectId(req.params.id), authorId: new Types.ObjectId(req.user!.id), body: req.body.body });
  await FeedPostModel.updateOne({ _id: req.params.id }, { $inc: { commentCount: 1 } });
  ok(res, comment, undefined, 201);
}));
