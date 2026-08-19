import { z } from 'zod';

export const registerSchema = z.object({
  educationLevel: z.enum(['Primary','JHS','SHS','WASSCE','Tertiary','Other']).optional(),
  subjects: z.array(z.string()).optional(),
  name: z.string().min(2),
  email: z.string().email().optional(),
  phone: z.string().min(9).optional(),
  password: z.string().min(8),
  role: z.enum(['student', 'teacher', 'parent', 'school_admin']),
  tenantSlug: z.string().min(2).default('marketplace'),
  dateOfBirth: z.coerce.date().optional(),
}).refine((d) => d.email || d.phone, { message: 'email or phone is required' });

export const loginSchema = z.object({
  identifier: z.string().min(3), // email or phone
  password: z.string().min(1),
  tenantSlug: z.string().default('marketplace'),
});

export const refreshSchema = z.object({ refreshToken: z.string().min(10) });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchoolSchema = z.object({
  schoolName: z.string().min(2),
  slug: z.string().min(2).max(40).regex(/^[a-zA-Z0-9-]+$/, 'Use letters, numbers and dashes only'),
  adminName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(8),
});
export type RegisterSchoolInput = z.infer<typeof registerSchoolSchema>;

export const acceptInviteSchema = z.object({
  token: z.string().min(10),
  name: z.string().min(2),
  password: z.string().min(8),
  phone: z.string().optional(),
});
