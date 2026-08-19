'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Video, Radio, ArrowRight, BookOpen, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';
import { LEVEL_THEME, levelActions, subjectsFor } from '@/lib/ghanaEducation';

interface Me { educationLevel?: string; programme?: string; subjects?: string[]; role?: string }
interface Session { _id: string; title?: string; status: string; level?: string; hostName?: string; priceGHS?: number; attendees?: { name?: string }[] }

export function LevelDashboard() {
  const token = useAuth((s) => s.accessToken) ?? undefined;
  const router = useRouter();
  const { data: me } = useQuery({ queryKey: ['me-level'], queryFn: () => api.get<Me>('/users/me', token), enabled: !!token });
  const { data: sessions } = useQuery({ queryKey: ['sessions-level'], queryFn: () => api.get<Session[]>('/classrooms', token), enabled: !!token, refetchInterval: 15000 });

  if (!me || me.role !== 'student') return null;
  const level = me.educationLevel;
  const theme = (level && LEVEL_THEME[level]) || { label: 'Student', tag: 'Welcome', gradient: 'from-brand to-brand-dark' };
  const subjects = (me.subjects && me.subjects.length ? me.subjects : subjectsFor(level, me.programme)).slice(0, 10);
  const actions = levelActions(level);

  // Classes relevant to this student's level (or open to all).
  const mine = (sessions ?? []).filter((s) => s.status !== 'ended' && (!s.level || s.level === 'Any' || s.level === level));
  const live = mine.filter((s) => s.status === 'live');
  const tertiary = ['Undergraduate', 'Postgraduate', 'PhD'].includes(level ?? '');
  const noun = tertiary ? 'lecture room' : 'class';

  const createRoom = async () => {
    const title = prompt(tertiary ? 'Name your lecture room:' : 'Name your class:', tertiary ? `${me.programme ?? 'Study'} Lecture` : 'Study Class');
    if (!title) return;
    const s = await api.post<{ _id: string }>('/classrooms', { title, level: level ?? 'Any', programme: me.programme, isPeer: true }, token);
    router.push(`/classroom/${s._id}`);
  };

  return (
    <div className="mb-5 space-y-4">
      {/* Themed level banner */}
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${theme.gradient} p-6 text-white`}>
        <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <p className="text-sm font-medium text-white/80">{theme.tag}</p>
        <h2 className="mt-0.5 text-2xl font-extrabold">{theme.label}{me.programme ? ` · ${me.programme}` : ''}</h2>
        {!level && <Link href="/profile" className="mt-2 inline-flex items-center gap-1 rounded-lg bg-white/20 px-3 py-1.5 text-sm font-semibold">Set your level to personalise <ArrowRight className="h-3.5 w-3.5" /></Link>}
        {subjects.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {subjects.map((s) => <span key={s} className="rounded-lg bg-white/15 px-2 py-0.5 text-xs font-medium">{s}</span>)}
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {actions.map((a) => <Link key={a.href} href={a.href} className="rounded-xl bg-white/90 px-3 py-1.5 text-sm font-semibold text-ink transition hover:bg-white">{a.label}</Link>)}
        </div>
      </div>

      {/* Live classes / lecture rooms for your level */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="inline-flex items-center gap-2 font-bold text-ink"><Video className="h-5 w-5 text-brand" /> {tertiary ? 'Lecture rooms for you' : 'Live classes & lectures for you'}</p>
          <div className="flex items-center gap-2">
            <button onClick={createRoom} className="rounded-lg border border-brand/30 px-3 py-1.5 text-sm font-semibold text-brand hover:bg-brand-soft">+ Create {noun}</button>
            <Link href="/classroom" className="text-sm font-semibold text-brand">See all →</Link>
          </div>
        </div>
        {mine.length === 0 && <p className="text-sm text-ink-soft">No {noun}s scheduled for your level yet — create one or check back soon.</p>}
        <div className="space-y-2">
          {mine.slice(0, 4).map((s) => (
            <div key={s._id} className="flex items-center justify-between rounded-xl border border-gray-100 p-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-semibold text-ink">
                  {s.status === 'live' && <span className="inline-flex items-center gap-1 rounded-md bg-coral/10 px-1.5 py-0.5 text-[11px] font-bold text-coral"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-coral" />LIVE</span>}
                  {s.title ?? (tertiary ? 'Lecture' : 'Class')}
                </p>
                <p className="text-xs text-ink-soft">
                  {s.hostName ? `Hosted by ${s.hostName}` : 'Learnova'} · {(s.priceGHS ?? 0) > 0 ? `₵${s.priceGHS}` : 'Free'}
                  {s.level && s.level !== 'Any' ? ` · ${s.level}` : ''}
                </p>
                {/* Who has joined */}
                {s.attendees && s.attendees.length > 0 && (
                  <p className="mt-1 inline-flex items-center gap-1 text-xs text-ink-soft"><Users className="h-3 w-3" /> {s.attendees.slice(0, 3).map((a) => a.name).filter(Boolean).join(', ')}{s.attendees.length > 3 ? ` +${s.attendees.length - 3} more` : ''} joined</p>
                )}
              </div>
              <button onClick={() => router.push(`/classroom/${s._id}`)} className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold text-white ${s.status === 'live' ? 'bg-coral' : 'bg-brand'}`}>{s.status === 'live' ? (tertiary ? 'Join lecture' : 'Join now') : 'Enter'}</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
