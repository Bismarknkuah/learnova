import { z } from 'zod';
import { validate } from '../../middleware/validate.js';
import { Router } from 'express';
import { asyncHandler, ok } from '../../core/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { gamificationService } from './gamification.service.js';

export const gamificationRoutes = Router();
gamificationRoutes.use(requireAuth);

gamificationRoutes.get('/me', asyncHandler(async (req, res) =>
  ok(res, await gamificationService.profile(req.user!.tenantId, req.user!.id))));

gamificationRoutes.get('/leaderboard', asyncHandler(async (req, res) =>
  ok(res, await gamificationService.leaderboard(req.user!.tenantId))));

gamificationRoutes.get('/rewards', asyncHandler(async (req, res) => ok(res, gamificationService.rewards)));
gamificationRoutes.post('/redeem', validate(z.object({ reward: z.string() })), asyncHandler(async (req, res) =>
  ok(res, await gamificationService.redeem(req.user!.tenantId, req.user!.id, req.body.reward))));
