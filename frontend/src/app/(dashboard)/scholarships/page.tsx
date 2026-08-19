'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Award, Plus, ExternalLink, CalendarClock, GraduationCap, Globe, MapPin } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';
import { useMe } from '@/features/profile/useMe';

interface Scholarship {
  _id: string; kind: string; title: string; sponsor?: string; amountGHS?: number; eligibility?: string;
  applyUrl?: string; deadline?: string; level?: string; fundingType?: string; studyLocation?: string; sponsorType?: string;
}
const KINDS = ['scholarship', 'grant', 'fellowship', 'internship'];
const LEVELS = ['KG', 'Primary', 'JHS', 'SHS', 'Undergraduate', 'Postgraduate'];
const TINT: Record<string, string> = { scholarship: 'bg-brand-soft text-brand', grant: 'bg-gold-soft text-gold-dark', fellowship: 'bg-violet-100 text-violet-700', internship: 'bg-sky-100 text-sky-700' };

export default function Scholarships() {
  const token = useAuth((s) => s.accessToken) ?? undefined;
  const qc = useQueryClient();
  const { data: me } = useMe();
  const [level, setLevel] = useState('');
  const [funding, setFunding] = useState('');
  const [location, setLocation] = useState('');
  const [showPost, setShowPost] = useState(false);
  const canPost = me?.role === 'teacher' || me?.role === 'school_admin' || me?.role === 'super_admin';

  const qs = new URLSearchParams();
  if (level) qs.set('level', level); if (funding) qs.set('fundingType', funding); if (location) qs.set('studyLocation', location);
  const { data } = useQuery({ queryKey: ['scholarships', level, funding, location], queryFn: () => api.get<Scholarship[]>(`/scholarships?${qs}`, token), enabled: !!token });

  const Pill = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button onClick={onClick} className={`rounded-xl px-3 py-1.5 text-sm font-medium ${on ? 'bg-brand text-white' : 'border border-gray-200 text-ink-soft hover:border-brand'}`}>{children}</button>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-ink">Scholarship marketplace</h1><p className="text-sm text-ink-soft">From KG to postgraduate — for study in Ghana and abroad.</p></div>
        {canPost && <button onClick={() => setShowPost((v) => !v)} className="inline-flex items-center gap-1 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" /> Post</button>}
      </div>

      {showPost && canPost && <PostForm token={token} isSchool={me?.role !== 'teacher'} onDone={() => { setShowPost(false); qc.invalidateQueries({ queryKey: ['scholarships'] }); }} />}

      {/* Level filter */}
      <div className="flex flex-wrap gap-1.5">
        <Pill on={level === ''} onClick={() => setLevel('')}>All levels</Pill>
        {LEVELS.map((l) => <Pill key={l} on={level === l} onClick={() => setLevel(l)}>{l}</Pill>)}
      </div>
      {/* Funding + location */}
      <div className="flex flex-wrap gap-1.5">
        <Pill on={funding === 'full'} onClick={() => setFunding(funding === 'full' ? '' : 'full')}>🎓 Full scholarship</Pill>
        <Pill on={funding === 'partial'} onClick={() => setFunding(funding === 'partial' ? '' : 'partial')}>Partial</Pill>
        <span className="mx-1 w-px bg-gray-200" />
        <Pill on={location === 'Ghana'} onClick={() => setLocation(location === 'Ghana' ? '' : 'Ghana')}><MapPin className="mr-1 inline h-3.5 w-3.5" />Study in Ghana</Pill>
        <Pill on={location === 'Abroad'} onClick={() => setLocation(location === 'Abroad' ? '' : 'Abroad')}><Globe className="mr-1 inline h-3.5 w-3.5" />Study abroad</Pill>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {(data ?? []).map((s) => (
          <Card key={s._id} className={s.fundingType === 'full' ? 'ring-1 ring-brand/40' : ''}>
            <div className="flex items-start justify-between">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-gold-soft text-gold-dark"><Award className="h-5 w-5" /></span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${TINT[s.kind] ?? 'bg-gray-100'}`}>{s.kind}</span>
            </div>
            <h3 className="mt-2 font-bold text-ink">{s.title}</h3>
            {s.sponsor && <p className="text-sm text-ink-soft">{s.sponsor}{s.sponsorType === 'school' ? ' · School-funded' : ''}</p>}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {s.fundingType === 'full' && <span className="rounded-md bg-brand px-1.5 py-0.5 text-[11px] font-semibold text-white">Full scholarship</span>}
              {s.level && s.level !== 'Any' && <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-ink-soft"><GraduationCap className="h-3 w-3" />{s.level}</span>}
              {s.studyLocation && s.studyLocation !== 'Any' && <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-ink-soft">{s.studyLocation === 'Abroad' ? <Globe className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}{s.studyLocation}</span>}
            </div>
            {s.amountGHS ? <p className="mt-2 font-semibold text-brand">₵{s.amountGHS.toLocaleString()}</p> : null}
            {s.eligibility && <p className="mt-1 text-xs text-ink-soft">{s.eligibility}</p>}
            <div className="mt-3 flex items-center justify-between">
              {s.deadline && <span className="inline-flex items-center gap-1 text-xs text-coral"><CalendarClock className="h-3.5 w-3.5" /> {new Date(s.deadline).toLocaleDateString()}</span>}
              {s.applyUrl && <a href={s.applyUrl} target="_blank" className="inline-flex items-center gap-1 rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white">Apply <ExternalLink className="h-3.5 w-3.5" /></a>}
            </div>
          </Card>
        ))}
        {!data?.length && <p className="text-ink-soft">No opportunities match these filters yet.</p>}
      </div>
    </div>
  );
}

function PostForm({ token, isSchool, onDone }: { token?: string; isSchool: boolean; onDone: () => void }) {
  const [f, setF] = useState({ kind: 'scholarship', title: '', sponsor: '', amountGHS: '', eligibility: '', applyUrl: '', deadline: '', level: 'Any', fundingType: 'partial', studyLocation: 'Ghana' });
  const submit = async () => {
    await api.post('/scholarships', {
      kind: f.kind, title: f.title, sponsor: f.sponsor || undefined,
      amountGHS: f.amountGHS ? Number(f.amountGHS) : undefined, eligibility: f.eligibility || undefined,
      applyUrl: f.applyUrl || undefined, deadline: f.deadline || undefined,
      level: f.level, fundingType: f.fundingType, studyLocation: f.studyLocation,
    }, token);
    onDone();
  };
  return (
    <Card className="space-y-2">
      <h3 className="font-semibold text-ink">Post an opportunity {isSchool && <span className="text-sm font-normal text-ink-soft">· schools can fund full scholarships</span>}</h3>
      <div className="grid gap-2 sm:grid-cols-2">
        <input placeholder="Title (e.g. GETFund Undergraduate Scholarship)" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm sm:col-span-2" />
        <input placeholder="Sponsor (e.g. GETFund, Scholarship Secretariat)" value={f.sponsor} onChange={(e) => setF({ ...f, sponsor: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        <input placeholder="Apply link (pasted — opens their site)" value={f.applyUrl} onChange={(e) => setF({ ...f, applyUrl: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        <select value={f.level} onChange={(e) => setF({ ...f, level: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm"><option value="Any">Any level</option>{LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}</select>
        <select value={f.fundingType} onChange={(e) => setF({ ...f, fundingType: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm"><option value="partial">Partial funding</option><option value="full">Full scholarship</option></select>
        <select value={f.studyLocation} onChange={(e) => setF({ ...f, studyLocation: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm"><option value="Ghana">Study in Ghana</option><option value="Abroad">Study abroad</option><option value="Any">Anywhere</option></select>
        <select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm capitalize">{KINDS.map((k) => <option key={k} value={k}>{k}</option>)}</select>
        <input type="number" placeholder="₵ Amount (optional)" value={f.amountGHS} onChange={(e) => setF({ ...f, amountGHS: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        <input type="date" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        <input placeholder="Eligibility" value={f.eligibility} onChange={(e) => setF({ ...f, eligibility: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm sm:col-span-2" />
      </div>
      <button onClick={submit} disabled={f.title.length < 2} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">Post opportunity</button>
    </Card>
  );
}
