'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/stores/auth';

/** Redirects to /login when there's no session. Wraps all dashboard pages. */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const token = useAuth((s) => s.accessToken);
  useEffect(() => { if (!token) router.replace('/login'); }, [token, router]);
  if (!token) return null;
  return <>{children}</>;
}
