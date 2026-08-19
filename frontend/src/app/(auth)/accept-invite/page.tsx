'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { GraduationCap, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';

function AcceptInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const setSession = useAuth((s) => s.setSession);

  const [info, setInfo] = useState<{ email: string; role: string; valid: boolean } | null>(null);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.get<{ email: string; role: string; valid: boolean }>(`/invites/lookup/${token}`).then(setInfo).catch(() => setInfo({ email: '', role: '', valid: false }));
  }, [token]);

  const accept = async () => {
    setBusy(true); setErr('');
    try {
      const r = await api.post<{ user: never; accessToken: string; refreshToken: string }>('/auth/accept-invite', { token, name, password });
      setSession(r as never); router.push('/home');
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="grid min-h-screen place-items-center p-6">
      <div className="w-full max-w-sm animate-fade-up">
        <div className="mb-6 inline-flex items-center gap-2 text-xl font-extrabold text-brand">
          <GraduationCap className="h-6 w-6" /> Learnova
        </div>
        {info && !info.valid ? (
          <div className="rounded-2xl border border-gray-200 p-6 text-center">
            <p className="font-semibold text-ink">This invite is invalid or has expired.</p>
            <Link href="/login" className="mt-3 inline-block text-sm font-semibold text-brand">Go to sign in</Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-extrabold text-ink">Join your school</h1>
            {info?.email && (
              <p className="mt-1 text-ink-soft">You’re invited as a <span className="font-semibold capitalize text-brand">{info.role.replace('_', ' ')}</span> — {info.email}</p>
            )}
            <div className="mt-6 space-y-3">
              <Input placeholder="Your full name" value={name} onChange={(e) => setName(e.target.value)} />
              <Input type="password" placeholder="Choose a password (min 8 chars)" value={password} onChange={(e) => setPassword(e.target.value)} />
              {err && <p className="text-sm text-coral">{err}</p>}
              <Button onClick={accept} disabled={busy || !name || !password} className="group w-full">
                {busy ? 'Joining…' : <>Join school <ArrowRight className="ml-1 h-4 w-4 transition group-hover:translate-x-0.5" /></>}
              </Button>
            </div>
            <ul className="mt-6 space-y-1.5 text-sm text-ink-soft">
              {['Your own dashboard', 'Access to your school’s tutors & resources', 'AI Twin & exam prep'].map((f) => (
                <li key={f} className="flex items-center gap-2"><Check className="h-4 w-4 text-brand" /> {f}</li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return <Suspense fallback={null}><AcceptInner /></Suspense>;
}
