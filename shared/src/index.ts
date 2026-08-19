/**
 * @learnova/shared — types shared by the API and the web app so the contract is single-sourced.
 * Keep this dependency-free (pure types + small enums/constants).
 */

export type Role = 'student' | 'teacher' | 'parent' | 'school_admin' | 'super_admin';

export type BookingType = 'one_on_one' | 'group' | 'assignment_review' | 'exam_prep';
export type BookingStatus =
  | 'pending_payment' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';

export type PaymentProvider = 'paystack' | 'mtn_momo' | 'telecel' | 'airteltigo';
export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';

export const CURRENCY = 'GHS' as const;

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: unknown };
  meta?: { page?: number; limit?: number; total?: number };
}

export interface AuthUser {
  id: string;
  role: Role;
  tenantId: string;
  tenantSlug?: string;
}

export interface TutorSummary {
  id: string;
  name: string;
  subjects: string[];
  languages: string[];
  hourlyRateGHS: number;
  rating: number;
  completedSessions: number;
  ghanaCardVerified: boolean;
  aiTwinEnabled: boolean;
}

export const EXAM_TRACKS = ['BECE', 'WASSCE', 'GRE', 'SAT', 'IELTS', 'TOEFL'] as const;
export type ExamTrack = (typeof EXAM_TRACKS)[number];

export * from './endpoints.js';
export * from './dto.js';
