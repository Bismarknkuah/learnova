import { Router } from 'express';
import { asyncHandler, ok } from '../../core/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { adaptiveService } from './adaptive.service.js';

export const adaptiveRoutes = Router();
adaptiveRoutes.use(requireAuth);

// The student's concept-mastery map (weakest first).
adaptiveRoutes.get('/mastery', asyncHandler(async (req, res) => {
  ok(res, await adaptiveService.masteryMap(req.user!.tenantId, req.user!.id));
}));

// Recommended next best activities from the adaptive engine.
adaptiveRoutes.get('/next', asyncHandler(async (req, res) => {
  ok(res, await adaptiveService.nextActivities(req.user!.tenantId, req.user!.id));
}));
