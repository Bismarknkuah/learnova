'use client';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';
import type { AuthUser } from '@learnova/shared';

interface Result { tenant: { id: string; name: string; slug: string }; user: AuthUser; accessToken: string; refreshToken: string }

export function useRegisterSchool() {
  const setSession = useAuth((s) => s.setSession);
  return useMutation({
    mutationFn: (input: { schoolName: string; slug: string; adminName: string; email: string; password: string; phone?: string }) =>
      api.post<Result>('/auth/register-school', input),
    onSuccess: (data) => setSession({ user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken }),
  });
}
