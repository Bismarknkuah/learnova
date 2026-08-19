'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { GraduationCap, Building2, User, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';
import { useRegisterSchool } from '@/features/auth/useRegisterSchool';

type Mode = 'learner' | 'school';

function RegisterInner() {
  const router = useRouter();
  const params = useSearchParams();
  const setSession = useAuth((s) => s.setSession);
  const [mode, setMode] = useState<Mode>(params.get('school') ? 'school' : 'learner');

  // shared fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  // learner
  const [role, setRole] = useState('student');
  const [educationLevel, setEducationLevel] = useState('SHS');
  const [subjectInput, setSubjectInput] = useState('');
  const [subjects, setSubjects] = useState<string[]>([]);
  const addSubject = () => { const v = subjectInput.trim(); if (v && !subjects.includes(v)) setSubjects([...subjects, v]); setSubjectInput(''); };
  // school
  const [schoolName, setSchoolName] = useState('');
  const [slug, setSlug] = useState('');
  const registerSchool = useRegisterSchool();

  const joinLearner = async () => {
    setBusy(true); setErr('');
    try {
      const r = await api.post<{ user: never; accessToken: string; refreshToken: string }>('/auth/register',
        { name, email, password, role, educationLevel, subjects, tenantSlug: 'marketplace' });
      setSession(r as never); router.push('/home');
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  const createSchool = async () => {
    setErr('');
    try {
      await registerSchool.mutateAsync({ schoolName, slug, adminName: name, email, password });
      router.push('/home');
    } catch (e) { setErr((e as Error).message); }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      {/* Form side */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md animate-fade-up">
          <div className="mb-6 inline-flex items-center gap-2 text-xl font-extrabold text-brand">
            <GraduationCap className="h-6 w-6" /> Learnova
          </div>

          {/* Mode switch */}
          <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl bg-gray-100 p-1">
            {([['learner', 'I’m a learner', User], ['school', 'Register a school', Building2]] as const).map(([m, label, Icon]) => (
              <button key={m} onClick={() => setMode(m)}
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${mode === m ? 'bg-white text-brand shadow-sm' : 'text-ink-soft'}`}>
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>

          {mode === 'learner' ? (
            <>
              <h1 className="text-2xl font-extrabold text-ink">Create your account</h1>
              <p className="mt-1 text-ink-soft">Join Learnova and start learning today.</p>
              <div className="mt-6 space-y-3">
                <Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
                <Input placeholder="Email" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} />
                <Input type="password" placeholder="Password (min 8 chars)" value={password} onChange={(e) => setPassword(e.target.value)} />
                <div className="grid grid-cols-3 gap-2">
                  {['student', 'teacher', 'parent'].map((r) => (
                    <button key={r} onClick={() => setRole(r)}
                      className={`rounded-xl border px-3 py-2 text-sm font-medium capitalize transition ${role === r ? 'border-brand bg-brand-soft text-brand' : 'border-gray-200 text-ink-soft'}`}>
                      {r}
                    </button>
                  ))}
                </div>
                {role === 'student' && (
                  <>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-ink-soft">Level of education</label>
                      <select value={educationLevel} onChange={(e) => setEducationLevel(e.target.value)}
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 outline-none focus:border-brand">
                        {['Primary', 'JHS', 'SHS', 'WASSCE', 'Tertiary', 'Other'].map((l) => <option key={l}>{l}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-ink-soft">Courses you’re taking</label>
                      <div className="flex gap-2">
                        <Input placeholder="e.g. Physics — press Add" value={subjectInput}
                          onChange={(e) => setSubjectInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSubject(); } }} />
                        <button onClick={addSubject} className="rounded-xl border border-gray-300 px-4 text-sm font-medium hover:border-brand">Add</button>
                      </div>
                      {subjects.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {subjects.map((sub) => (
                            <span key={sub} className="inline-flex items-center gap-1 rounded-lg bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand">
                              {sub}
                              <button onClick={() => setSubjects(subjects.filter((x) => x !== sub))} className="text-brand/60 hover:text-brand">×</button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
                {err && <p className="text-sm text-coral">{err}</p>}
                <Button onClick={joinLearner} disabled={busy} className="group w-full">
                  {busy ? 'Creating…' : <>Create account <ArrowRight className="ml-1 h-4 w-4 transition group-hover:translate-x-0.5" /></>}
                </Button>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-extrabold text-ink">Register your school</h1>
              <p className="mt-1 text-ink-soft">Get your own branded, isolated Learnova space.</p>
              <div className="mt-6 space-y-3">
                <Input placeholder="School name" value={schoolName}
                  onChange={(e) => { setSchoolName(e.target.value); setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')); }} />
                <div>
                  <Input placeholder="school-address" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} />
                  <p className="mt-1 text-xs text-ink-soft">Your space: <span className="font-medium text-brand">{slug || 'your-school'}.learnova.app</span></p>
                </div>
                <div className="h-px bg-gray-100" />
                <p className="text-sm font-medium text-ink-soft">Admin account</p>
                <Input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
                <Input placeholder="Admin email" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} />
                <Input type="password" placeholder="Password (min 8 chars)" value={password} onChange={(e) => setPassword(e.target.value)} />
                {err && <p className="text-sm text-coral">{err}</p>}
                <Button onClick={createSchool} disabled={registerSchool.isPending} className="group w-full">
                  {registerSchool.isPending ? 'Setting up your school…' : <>Create school space <ArrowRight className="ml-1 h-4 w-4 transition group-hover:translate-x-0.5" /></>}
                </Button>
              </div>
            </>
          )}

          <p className="mt-6 text-center text-sm text-ink-soft">
            Already have an account? <Link href="/login" className="font-semibold text-brand">Sign in</Link>
          </p>
        </div>
      </div>

      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-[#0a5d43] p-12 text-white lg:flex lg:flex-col lg:justify-center">
        <div className="aurora">
          <span className="aurora-blob h-72 w-72 bg-emerald-400" style={{ top: '10%', right: '10%' }} />
          <span className="aurora-blob h-80 w-80 bg-gold" style={{ bottom: '5%', left: '5%', animationDelay: '4s' }} />
        </div>
        <div className="relative z-10 animate-fade-up">
          <h2 className="text-4xl font-extrabold leading-tight">
            {mode === 'school' ? <>Run your school on <span className="text-shimmer">Learnova</span>.</> : <>Your learning, <span className="text-shimmer">supercharged</span>.</>}
          </h2>
          <ul className="mt-6 space-y-3 text-white/85">
            {(mode === 'school'
              ? ['Your own subdomain & branding', 'A separate, isolated school database', 'Teacher, parent & student dashboards', 'Admin control over every account']
              : ['AI Twin tutor available 24/7', 'Adaptive learning path', 'Virtual labs & exam prep', 'Track XP, badges & streaks']
            ).map((f) => (
              <li key={f} className="flex items-center gap-2"><Check className="h-5 w-5 text-gold" /> {f}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return <Suspense fallback={null}><RegisterInner /></Suspense>;
}
