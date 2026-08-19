import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, ok } from '../../core/http.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { authLimiter } from '../../middleware/rateLimit.js';
import { authController } from './auth.controller.js';
import { registerSchema, loginSchema, refreshSchema, registerSchoolSchema, acceptInviteSchema } from './auth.validation.js';

export const authRoutes = Router();

authRoutes.post('/register', authLimiter, validate(registerSchema), asyncHandler(authController.register));
authRoutes.post('/register-school', authLimiter, validate(registerSchoolSchema), asyncHandler(authController.registerSchool));
authRoutes.post('/accept-invite', authLimiter, validate(acceptInviteSchema), asyncHandler(authController.acceptInvite));
authRoutes.post('/login', authLimiter, validate(loginSchema), asyncHandler(authController.login));
authRoutes.post('/refresh', validate(refreshSchema), asyncHandler(authController.refresh));
authRoutes.get('/me', requireAuth, asyncHandler(authController.me));

// ---- MFA ----
authRoutes.post('/mfa/setup', requireAuth, asyncHandler(async (req, res) => ok(res, await authService.mfaSetup(req.user!))));
authRoutes.post('/mfa/enable', requireAuth, validate(z.object({ code: z.string().min(6) })), asyncHandler(async (req, res) => ok(res, await authService.mfaEnable(req.user!, req.body.code))));
authRoutes.post('/mfa/disable', requireAuth, validate(z.object({ code: z.string().min(6) })), asyncHandler(async (req, res) => ok(res, await authService.mfaDisable(req.user!, req.body.code))));
authRoutes.post('/mfa/login', validate(z.object({ mfaToken: z.string(), code: z.string().min(6) })), asyncHandler(async (req, res) => ok(res, await authService.mfaLogin(req.body.mfaToken, req.body.code))));

// ---- Google OAuth ----
authRoutes.post('/google', validate(z.object({ credential: z.string(), tenantSlug: z.string().default('marketplace') })), asyncHandler(async (req, res) => ok(res, await authService.googleLogin(req.body.credential, req.body.tenantSlug))));
