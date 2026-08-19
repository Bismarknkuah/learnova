import type { Request, Response } from 'express';
import { ok } from '../../core/http.js';
import { tutorService } from './tutor.service.js';

export const tutorController = {
  async create(req: Request, res: Response) {
    const tutor = await tutorService.createProfile(req.user!.tenantId, req.user!.id, req.body);
    ok(res, tutor, undefined, 201);
  },
  async get(req: Request, res: Response) {
    const tutor = await tutorService.getProfile(req.user!.tenantId, req.params.id);
    ok(res, tutor);
  },
  async update(req: Request, res: Response) {
    const tutor = await tutorService.updateProfile(req.user!.tenantId, req.params.id, req.body);
    ok(res, tutor);
  },
  async search(req: Request, res: Response) {
    // If the caller is a logged-in student, pass their profile for AI ranking.
    const student = req.user?.role === 'student' ? { id: req.user.id, ...req.query } : undefined;
    const result = await tutorService.searchAndRank(req.user!.tenantId, req.query as never, student);
    ok(res, result.items, { page: result.page, limit: result.limit, total: result.total });
  },
};
