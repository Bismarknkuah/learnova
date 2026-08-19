'use client';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';
import type { AuthUser } from '@learnova/shared';

interface Tokens { user: AuthUser; accessToken: string; refreshToken: string }
type LoginResult = Tokens | { mfaRequired: true; mfaToken: string };

export function useLogin() {
  const setSession = useAuth((s) => s.setSession);
  return useMutation({
    mutationFn: (input: { identifier: string; password: string; tenantSlug?: string }) =>
      api.post<LoginResult>('/auth/login', input),
    onSuccess: (data) => { if (!('mfaRequired' in data)) setSession(data); },
  });
}

export function useMfaLogin() {
  const setSession = useAuth((s) => s.setSession);
  return useMutation({
    mutationFn: (input: { mfaToken: string; code: string }) => api.post<Tokens>('/auth/mfa/login', input),
    onSuccess: (data) => setSession(data),
  });
}

export function useGoogleLogin() {
  const setSession = useAuth((s) => s.setSession);
  return useMutation({
    mutationFn: (credential: string) => api.post<LoginResult>('/auth/google', { credential, tenantSlug: 'marketplace' }),
    onSuccess: (data) => { if (!('mfaRequired' in data)) setSession(data); },
  });
}
