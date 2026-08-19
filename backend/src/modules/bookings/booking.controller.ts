import type { Request, Response } from 'express';
import { BookingModel } from './booking.model.js';
import { agentSystem } from '../../agents/index.js';
import { ok } from '../../core/http.js';
import { ok } from '../../core/http.js';
import { bookingService } from './booking.service.js';

export const bookingController = {
  async create(req: Request, res: Response) {
    const result = await bookingService.create(req.user!.tenantId, req.user!.id, req.body);
    ok(res, result, undefined, 201);
  },
  /**
   * Smart Scheduling Agent: proposes conflict-free time slots for a tutor over the next 7 days.
   * Checks the tutor's existing bookings so no two sessions overlap.
   */
  async suggest(req: Request, res: Response) {
    const tutorId = String(req.query.tutorId ?? '');
    const durationMin = Number(req.query.durationMin ?? 60);
    const now = Date.now();
    const DAY = 86_400_000;

    // Default availability: next 7 days, 16:00–20:00 (windows the agent intersects).
    const windows = Array.from({ length: 7 }, (_, d) => {
      const day = new Date(now + (d + 1) * DAY);
      const start = new Date(day); start.setHours(16, 0, 0, 0);
      const end = new Date(day); end.setHours(20, 0, 0, 0);
      return { start: start.getTime(), end: end.getTime() };
    });

    const existing = tutorId
      ? (await BookingModel.find({ tutorId, startAt: { $gte: new Date(now) } }).select('startAt endAt'))
          .map((b) => ({ start: new Date(b.startAt).getTime(), end: new Date(b.endAt).getTime() }))
      : [];

    const result = await agentSystem.supervisor.route('scheduling', {
      input: { teacherAvail: windows, studentAvail: windows, existingBookings: existing, durationMin },
    });
    const slots = (result.slots as { start: number; end: number }[]).map((sl) => ({
      start: new Date(sl.start).toISOString(), end: new Date(sl.end).toISOString(),
    }));
    ok(res, { slots });
  },

  async list(req: Request, res: Response) {
    const items = await bookingService.list(req.user!.tenantId, req.user!.id);
    ok(res, items);
  },
};
