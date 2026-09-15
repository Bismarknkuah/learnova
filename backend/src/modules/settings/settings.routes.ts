import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, ok } from '../../core/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { getDisabledMap, setDisabledMap } from './settings.model.js';

export const settingsRoutes = Router();
settingsRoutes.use(requireAuth);

// Any signed-in user reads the feature map + their own effective disabled list (for the sidebar).
settingsRoutes.get('/features', asyncHandler(async (req, res) => {
  const disabled = await getDisabledMap();
  ok(res, { disabled, mine: disabled[req.user!.role] ?? [] });
}));

// Super admin updates the whole map.
settingsRoutes.patch('/features', requireRole('super_admin'), validate(z.object({
  disabled: z.record(z.array(z.string())),
})), asyncHandler(async (req, res) => {
  ok(res, { disabled: await setDisabledMap(req.body.disabled) });
}));
