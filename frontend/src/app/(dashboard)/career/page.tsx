'use client';
import { useState } from 'react';
import { Compass, Briefcase, GraduationCap, Award, BadgeCheck } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';

interface Guidance {
  careers?: { title: string; why: string }[];
  universities?: string[]; scholarships?: string[]; certifications?: string[]; note?: string;
}

function ChipInput({ label, items, setItems, placeholder }: { label: string; items: string[]; setItems: (v: string[]) => void; placeholder: string }) {
  const [v, setV] = useState('');
  const add = () => { const t = v.trim(); if (t && !items.includes(t)) setItems([...items, t]); setV(''); };
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-ink-soft">{label}</label>
      <div className="flex gap-2">
        <Input placeholder={placeholder} value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
        <button onClick={add} className="rounded-xl border border-gray-300 px-4 text-sm font-medium hover:border-brand">Add</button>
      </div>
      {items.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {items.map((it) => (
            <span key={it} className="inline-flex items-center gap-1 rounded-lg bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand">
              {it}<button onClick={() => setItems(items.filter((x) => x !== it))} className="text-brand/60">×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CareerPage() {
  const token = useAuth((s) => s.accessToken) ?? undefined;
  const [interests, setInterests] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [strengths, setStrengths] = useState<string[]>([]);
  const [res, setRes] = useState<Guidance | null>(null);
  const [busy, setBusy] = useState(false);

  const ask = async () => {
    setBusy(true);
    try { setRes(await api.post<Guidance>('/career/guidance', { interests, skills, strengths }, token)); }
    finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white"><Compass className="h-5 w-5" /></span>
        <div><h1 className="text-2xl font-bold text-ink">AI Career Mentor</h1><p className="text-sm text-ink-soft">Tell me about you — I’ll map careers, universities, scholarships & certifications.</p></div>
      </div>

      <Card className="space-y-4">
        <ChipInput label="Your interests" items={interests} setItems={setInterests} placeholder="e.g. Building things" />
        <ChipInput label="Your skills" items={skills} setItems={setSkills} placeholder="e.g. Coding" />
        <ChipInput label="Academic strengths" items={strengths} setItems={setStrengths} placeholder="e.g. Mathematics" />
        <Button onClick={ask} disabled={busy || (!interests.length && !skills.length)} className="w-full">{busy ? 'Thinking…' : 'Get my guidance'}</Button>
      </Card>

      {res && (
        <div className="space-y-4">
          {res.careers?.length ? (
            <Card>
              <h2 className="mb-2 inline-flex items-center gap-2 font-semibold text-ink"><Briefcase className="h-5 w-5 text-brand" /> Careers</h2>
              <div className="space-y-2">{res.careers.map((c, i) => <div key={i}><p className="font-semibold text-ink">{c.title}</p><p className="text-sm text-ink-soft">{c.why}</p></div>)}</div>
            </Card>
          ) : null}
          {res.universities?.length ? <Card><h2 className="mb-1 inline-flex items-center gap-2 font-semibold text-ink"><GraduationCap className="h-5 w-5 text-sky-600" /> Universities</h2><p className="text-sm text-ink-soft">{res.universities.join(' · ')}</p></Card> : null}
          {res.scholarships?.length ? <Card><h2 className="mb-1 inline-flex items-center gap-2 font-semibold text-ink"><Award className="h-5 w-5 text-gold-dark" /> Scholarships</h2><p className="text-sm text-ink-soft">{res.scholarships.join(' · ')}</p></Card> : null}
          {res.certifications?.length ? <Card><h2 className="mb-1 inline-flex items-center gap-2 font-semibold text-ink"><BadgeCheck className="h-5 w-5 text-brand" /> Certifications</h2><p className="text-sm text-ink-soft">{res.certifications.join(' · ')}</p></Card> : null}
          {res.note && <p className="text-center text-sm text-ink-soft">{res.note} — add your Anthropic key for full guidance.</p>}
        </div>
      )}
    </div>
  );
}
