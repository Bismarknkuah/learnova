import type { Role, BookingType, BookingStatus } from './index.js';

export interface RegisterDto {
  name: string;
  email?: string;
  phone?: string;
  password: string;
  role: Exclude<Role, 'super_admin'>;
  tenantSlug?: string;
  dateOfBirth?: string;
}
export interface LoginDto {
  identifier: string;
  password: string;
  tenantSlug?: string;
}
export interface SessionDto {
  user: { id: string; name: string; role: Role; tenantId: string; email?: string };
  accessToken: string;
  refreshToken: string;
}
export interface AskDto {
  question: string;
  twinId?: string;
  subject?: string;
  studentLevel?: string;
}
export interface AskResultDto {
  answer: string;
  citations: { ref: number; source: string }[];
  twinId: string | null;
}
export interface CreateBookingDto {
  tutorId: string;
  type: BookingType;
  startAt: string;
  endAt: string;
}
export interface BookingDto {
  _id: string;
  type: BookingType;
  startAt: string;
  endAt: string;
  priceGHS: number;
  status: BookingStatus;
}

export interface JoinClassDto { room: string; token: string; url: string; sessionId: string }
export interface MasteryDto { concept: string; subject?: string; pKnown: number; observations: number; correct: number }
export interface RecommendationDto {
  concept: string; subject?: string; mastery: number; priority: number;
  action: 'foundational_lesson' | 'guided_practice' | 'challenge_quiz'; reason: string;
}
