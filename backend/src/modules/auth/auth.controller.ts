import type { Request, Response } from 'express';
import { ok } from '../../core/http.js';
import { authService } from './auth.service.js';

export const authController = {
  async acceptInvite(req: Request, res: Response) {
    const result = await authService.acceptInvite(req.body);
    ok(res, result, undefined, 201);
  },

  async registerSchool(req: Request, res: Response) {
    const result = await authService.registerSchool(req.body);
    ok(res, result, undefined, 201);
  },

  async register(req: Request, res: Response) {
    const result = await authService.register(req.body);
    ok(res, result, undefined, 201);
  },
  async login(req: Request, res: Response) {
    const result = await authService.login(req.body);
    ok(res, result);
  },
  async refresh(req: Request, res: Response) {
    const result = await authService.refresh(req.body.refreshToken);
    ok(res, result);
  },
  async me(req: Request, res: Response) {
    const result = await authService.me(req.user!);
    ok(res, result);
  },
};
