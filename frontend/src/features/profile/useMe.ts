'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';
import type { Role } from '@learnova/shared';

interface Me { _id: string; name: string; role: Role; email?: string; tenantId: string; educationLevel?: string; programme?: string }

export function useMe() {
  const token = useAuth((s) => s.accessToken) ?? undefined;
  return useQuery({ queryKey: ['me'], queryFn: () => api.get<Me>('/auth/me', token), enabled: !!token });
}
