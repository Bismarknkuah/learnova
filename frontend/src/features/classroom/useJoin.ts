'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';

export interface JoinInfo { url: string; token: string; room: string; sessionId: string }

export function useJoin(sessionId: string) {
  const token = useAuth((s) => s.accessToken);
  return useQuery({
    queryKey: ['join', sessionId],
    queryFn: () => api.post<JoinInfo>(`/classrooms/${sessionId}/join`, {}, token ?? undefined),
    enabled: !!token && !!sessionId,
    staleTime: 0,
  });
}
