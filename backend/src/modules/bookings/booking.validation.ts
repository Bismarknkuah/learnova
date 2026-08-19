import { z } from 'zod';

export const createBookingSchema = z.object({
  tutorId: z.string().min(8),
  type: z.enum(['one_on_one', 'group', 'assignment_review', 'exam_prep']).default('one_on_one'),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
}).refine((d) => d.endAt > d.startAt, { message: 'endAt must be after startAt' });
