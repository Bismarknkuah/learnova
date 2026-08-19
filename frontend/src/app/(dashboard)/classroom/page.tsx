'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Video, Plus, Radio, Clock, CheckCircle2, Users } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';
import { useMe } from '@/features/profile/useMe';
import { LEVELS } from '@/lib/ghanaEducation';

interface Session { _id: string; title?: string; status: 'scheduled' | 'live' | 'ended'; hostName?: string; attendees?: { name?: string }[]; level?: string; priceGHS?: number; isPeer?: boolean; subject?: string; createdAt?: string }

export default function ClassroomList() {
  const token = useAuth((s) => s.accessToken) ?? undefined;
  const { data: me } = useMe();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: sessions, isLoading } = useQuery({ queryKey: ['sessions'], queryFn: () => api.get<Session[]>('/classrooms', token), enabled: !!token, refetchInterval: 10000 });
  const canHost = me?.role === 'teacher' || me?.role === 'school_admin' || me?.role === 'super_admin';
  const [filter, setFilter] = useState<'all' | 'free' | 'paid' | 'peer'>('all');
  const [search, setSearch] = useState('');

  const startClass = async (peer = false) => {
    const title = prompt(peer ? 'Name your peer study class:' : 'Class title:', peer ? 'Peer Study Group' : 'Live Class');
    if (!title) return;
    let priceGHS = 0; let level = 'Any';
    if (!peer && canHost) {
      const pr = prompt('Price in ₵ (0 for free):', '0'); priceGHS = Number(pr) || 0;
      const lv = prompt(`Level (one of: Any, ${LEVELS.join(', ')}):`, 'Any'); level = lv || 'Any';
    }
    const s = await api.post<{ _id: string }>('/classrooms', { title, priceGHS, isPeer: peer, level }, token);
    qc.invalidateQueries({ queryKey: ['sessions'] });
    router.push(`/classroom/${s._id}`);
  };

  const match = (s: Session) => (filter === 'all' || (filter === 'free' && !s.priceGHS) || (filter === 'paid' && (s.priceGHS ?? 0) > 0) || (filter === 'peer' && s.isPeer))
    && (!search || (s.title ?? '').toLowerCase().includes(search.toLowerCase()) || (s.subject ?? '').toLowerCase().includes(search.toLowerCase()));
  const all = (sessions ?? []).filter(match);
  const live = all.filter((s) => s.status === 'live');
  const upcoming = all.filter((s) => s.status === 'scheduled');
  const ended = all.filter((s) => s.status === 'ended').slice(0, 6);

  const Row = ({ s }: { s: Session }) => (
    <Card className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className={`grid h-11 w-11 place-items-center rounded-xl ${s.status === 'live' ? 'bg-coral/10 text-coral' : s.status === 'scheduled' ? 'bg-gold-soft text-gold-dark' : 'bg-gray-100 text-gray-400'}`}>
          {s.status === 'live' ? <Radio className="h-5 w-5" /> : s.status === 'scheduled' ? <Clock className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
        </span>
        <div>
          <p className="font-semibold text-ink">{s.title ?? 'Class session'}</p>
          <p className="text-xs text-ink-soft">{s.hostName ? `Hosted by ${s.hostName}` : 'Learnova class'}{s.level && s.level !== 'Any' ? ` · ${s.level}` : ''}</p>
          {s.attendees && s.attendees.length > 0 && <p className="text-xs text-ink-soft">👥 {s.attendees.slice(0, 3).map((a) => a.name).filter(Boolean).join(', ')}{s.attendees.length > 3 ? ` +${s.attendees.length - 3}` : ''} joined</p>}
          <div className="mt-1 flex gap-1.5">
            <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${(s.priceGHS ?? 0) > 0 ? 'bg-gold-soft text-gold-dark' : 'bg-brand-soft text-brand'}`}>{(s.priceGHS ?? 0) > 0 ? `₵${s.priceGHS}` : 'Free'}</span>
            {s.isPeer && <span className="rounded-md bg-violet-100 px-1.5 py-0.5 text-[11px] font-semibold text-violet-700">Peer</span>}
          </div>
        </div>
      </div>
      {s.status === 'ended'
        ? <button onClick={() => router.push(`/classroom/${s._id}/replay`)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium hover:border-brand">Watch replay</button>
        : <button onClick={() => router.push(`/classroom/${s._id}`)} className={`rounded-xl px-5 py-2 text-sm font-semibold text-white ${s.status === 'live' ? 'bg-coral' : 'bg-brand'}`}>{s.status === 'live' ? 'Join now' : 'Enter'}</button>}
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="inline-flex items-center gap-2 text-2xl font-bold text-ink"><Video className="h-6 w-6 text-brand" /> Live Classrooms</h1><p className="text-sm text-ink-soft">Join live classes, enter scheduled rooms, or rewatch replays.</p></div>
        <div className="flex gap-2">
          {!canHost && <button onClick={() => startClass(true)} className="inline-flex items-center gap-1 rounded-xl border border-violet-300 px-3 py-2 text-sm font-medium text-violet-700 hover:bg-violet-50"><Plus className="h-4 w-4" /> Create peer class</button>}
          {canHost && <button onClick={() => startClass(false)} className="inline-flex items-center gap-1 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" /> Start a class</button>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search classes…" className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand" />
        {(['all', 'free', 'paid', 'peer'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize ${filter === f ? 'bg-brand text-white' : 'border border-gray-200 text-ink-soft hover:border-brand'}`}>{f}</button>
        ))}
      </div>

      {isLoading && <p className="text-ink-soft">Loading classes…</p>}

      {live.length > 0 && <div className="space-y-2"><p className="flex items-center gap-2 text-sm font-semibold text-coral"><span className="h-2 w-2 animate-pulse rounded-full bg-coral" /> Live now</p>{live.map((s) => <Row key={s._id} s={s} />)}</div>}

      {upcoming.length > 0 && <div className="space-y-2"><p className="text-sm font-semibold text-ink">Scheduled</p>{upcoming.map((s) => <Row key={s._id} s={s} />)}</div>}

      {ended.length > 0 && <div className="space-y-2"><p className="text-sm font-semibold text-ink-soft">Recent replays</p>{ended.map((s) => <Row key={s._id} s={s} />)}</div>}

      {!isLoading && !sessions?.length && (
        <Card className="flex flex-col items-center py-12 text-center">
          <Users className="h-10 w-10 text-brand/30" />
          <p className="mt-2 font-semibold text-ink">No classes yet</p>
          <p className="text-sm text-ink-soft">{canHost ? 'Start a class to get going.' : 'Check back when your teacher starts a class.'}</p>
          {canHost ? <button onClick={() => startClass(false)} className="mt-4 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white">Start a class</button> : <button onClick={() => startClass(true)} className="mt-4 rounded-xl border border-violet-300 px-4 py-2 text-sm font-semibold text-violet-700">Create a peer class</button>}
        </Card>
      )}
    </div>
  );
}
