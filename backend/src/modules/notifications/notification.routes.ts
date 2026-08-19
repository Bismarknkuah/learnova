import { Router } from 'express';
import { asyncHandler, ok } from '../../core/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { NotificationModel } from './notification.model.js';

export const notificationRoutes = Router();
notificationRoutes.use(requireAuth);

notificationRoutes.get('/', asyncHandler(async (req, res) => {
  const items = await NotificationModel.find({
    tenantId: req.user!.tenantId, userId: req.user!.id,
  }).sort({ createdAt: -1 }).limit(50);
  ok(res, items);
}));

notificationRoutes.post('/:id/read', asyncHandler(async (req, res) => {
  const n = await NotificationModel.findOneAndUpdate(
    { _id: req.params.id, userId: req.user!.id },
    { readAt: new Date() },
    { new: true },
  );
  ok(res, n);
}));
