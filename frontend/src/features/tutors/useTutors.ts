'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';
import type { TutorCardData } from '@/components/tutors/TutorCard';

export interface TutorFilters {
  subject?: string; maxPriceGHS?: number; language?: string;
  gender?: string; teachingStyle?: string; minRating?: number; country?: string; isPeer?: boolean;
}

export function useTutors(params: TutorFilters) {
  const token = useAuth((s) => s.accessToken);
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) qs.set(k, String(v)); });
  return useQuery({
    queryKey: ['tutors', params],
    queryFn: () => api.get<TutorCardData[]>(`/tutors?${qs.toString()}`, token ?? undefined),
    enabled: !!token,
  });
}
