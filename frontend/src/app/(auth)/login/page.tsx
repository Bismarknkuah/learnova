'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { GraduationCap, Sparkles, FlaskConical, Trophy, ArrowRight, User, Briefcase, ShieldCheck, Video, Compass, Languages, Users2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useLogin, useMfaLogin, useGoogleLogin } from '@/features/auth/useLogin';
import { GoogleButton } from '@/components/auth/GoogleButton';

const PROOF = [
  { icon: Sparkles, label: '24/7 AI Twin tutors' },
  { icon: Video, label: 'Live HD classrooms' },
  { icon: FlaskConical, label: 'Virtual labs' },
  { icon: Trophy, label: 'WASSCE · BECE · SAT · IELTS' },
  { icon: Compass, label: 'AI career mentor' },
  { icon: Languages, label: '12 languages' },
];
const QUICK = [
  { label: 'Student', email: 'ama@learnova.dev', icon: User },
  { label: 'Teacher', email: 'mensah@learnova.dev', icon: Briefcase },
  { label: 'Parent', email: 'parent@learnova.dev', icon: Users2 },
  { label: 'Admin', email: 'admin@learnova.dev', icon: ShieldCheck },
];

export default function LoginPage() {
  const router = useRouter();
  const login = useLogin();
  const mfaLogin = useMfaLogin();
  const googleLogin = useGoogleLogin();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [code, setCode] = useState('');

  const go = async (id: string, pw: string) => {
    const r = await login.mutateAsync({ identifier: id, password: pw, tenantSlug: 'marketplace' });
    if ('mfaRequired' in r) setMfaToken(r.mfaToken); else router.push('/home');
  };
  const verifyMfa = async () => { await mfaLogin.mutateAsync({ mfaToken: mfaToken!, code }); router.push('/home'); };
  const onGoogle = async (credential: string) => { const r = await googleLogin.mutateAsync(credential); if ('mfaRequired' in r) setMfaToken(r.mfaToken); else router.push('/home'); };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-[#0a5d43] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        {/* Background photo with brand overlay for readability */}
        <img src="/login-bg.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a5d43]/95 via-[#0a5d43]/80 to-brand/70" />
        <div className="aurora opacity-60">
          <span className="aurora-blob h-72 w-72 bg-emerald-400" style={{ top: '5%', left: '10%' }} />
          <span className="aurora-blob h-80 w-80 bg-brand" style={{ bottom: '0%', right: '5%', animationDelay: '3s' }} />
          <span className="aurora-blob h-64 w-64 bg-gold" style={{ top: '40%', left: '45%', animationDelay: '6s' }} />
        </div>
        <div className="relative z-10 inline-flex items-center gap-2 text-2xl font-extrabold">
          <GraduationCap className="h-7 w-7" /> Learnova
        </div>
        <div className="relative z-10 animate-fade-up">
          <h2 className="text-5xl font-extrabold leading-[1.05]">Learn smarter,<br />the <span className="text-shimmer">West African</span> way.</h2>
          <p className="mt-5 max-w-md text-lg text-white/80">AI tutors and teacher twins, live classrooms, virtual labs, exam prep, career mentoring and verifiable certificates — built for Ghana and beyond.</p>
          <div className="mt-8 flex flex-wrap gap-2.5">
            {PROOF.map((p) => (
              <span key={p.label} className="glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium">
                <p.icon className="h-4 w-4 text-gold" /> {p.label}
              </span>
            ))}
          </div>
        </div>
        <p className="relative z-10 text-sm text-white/60">Trusted by students and schools across Ghana · Designed by Desward Technologies</p>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm animate-fade-up">
          <div className="mb-6 inline-flex items-center gap-2 text-xl font-extrabold text-brand lg:hidden">
            <GraduationCap className="h-6 w-6" /> Learnova
          </div>
          <h1 className="text-3xl font-extrabold text-ink">Welcome back</h1>
          <p className="mt-1 text-ink-soft">Sign in to continue learning.</p>

          {mfaToken ? (
            <div className="mt-7 space-y-3">
              <p className="text-sm text-ink-soft">Enter the 6-digit code from your authenticator app.</p>
              <Input inputMode="numeric" placeholder="123456" value={code} onChange={(e) => setCode(e.target.value)} />
              {mfaLogin.error && <p className="text-sm text-coral">{(mfaLogin.error as Error).message}</p>}
              <Button onClick={verifyMfa} disabled={mfaLogin.isPending || code.length < 6} className="w-full">{mfaLogin.isPending ? 'Verifying…' : 'Verify & sign in'}</Button>
              <button onClick={() => { setMfaToken(null); setCode(''); }} className="w-full text-sm text-ink-soft">← Back</button>
            </div>
          ) : (
          <div className="mt-7 space-y-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-soft">Email or phone</label>
              <Input placeholder="you@example.com" autoCapitalize="none" value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-soft">Password</label>
              <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {login.error && <p className="text-sm text-coral">{(login.error as Error).message}</p>}
            <Button onClick={() => go(identifier, password)} disabled={login.isPending} className="group w-full">
              {login.isPending ? 'Signing in…' : <>Sign in <ArrowRight className="ml-1 h-4 w-4 transition group-hover:translate-x-0.5" /></>}
            </Button>
            <div className="flex items-center gap-3 text-xs text-ink-soft"><span className="h-px flex-1 bg-gray-200" /> or <span className="h-px flex-1 bg-gray-200" /></div>
            <GoogleButton onCredential={onGoogle} />
          </div>
          )}

          {/* Quick access */}
          <div className="mt-6">
            <div className="flex items-center gap-3 text-xs text-ink-soft">
              <span className="h-px flex-1 bg-gray-200" /> Quick access (demo) <span className="h-px flex-1 bg-gray-200" />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {QUICK.map((q) => (
                <button key={q.label} onClick={() => go(q.email, 'password123')} disabled={login.isPending}
                  className="flex flex-col items-center gap-1 rounded-xl border border-gray-200 bg-white px-2 py-3 text-xs font-medium text-ink transition hover:border-brand hover:bg-brand-soft disabled:opacity-50">
                  <q.icon className="h-5 w-5 text-brand" /> {q.label}
                </button>
              ))}
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-ink-soft">
            New here? <Link href="/register" className="font-semibold text-brand">Create account</Link> · <Link href="/register?school=1" className="font-semibold text-brand">Register a school</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
