import { z } from 'zod';

export const createTutorSchema = z.object({
  headline: z.string().min(4).max(120),
  bio: z.string().max(2000).optional(),
  subjects: z.array(z.string()).min(1),
  levels: z.array(z.string()).default([]),
  languages: z.array(z.string()).default(['English']),
  hourlyRateGHS: z.number().positive().max(10000),
});

export const searchTutorSchema = z.object({
  subject: z.string().optional(),
  language: z.string().optional(),
  gender: z.enum(['male','female','other']).optional(),
  teachingStyle: z.enum(['structured','exam-focused','conversational','visual','practical']).optional(),
  country: z.string().optional(),
  availability: z.string().optional(),
  isPeer: z.coerce.boolean().optional(),
  maxPriceGHS: z.coerce.number().positive().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(50).optional(),
});
