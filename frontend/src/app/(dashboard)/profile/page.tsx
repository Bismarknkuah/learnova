'use client';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { UserCircle, Upload, Save } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';
import { LEVELS, SHS_PROGRAMMES, subjectsFor } from '@/lib/ghanaEducation';

interface MeProfile {
  name?: string; email?: string; avatarUrl?: string; bio?: string;
  educationLevel?: string; programme?: string; subjects?: string[]; interests?: string[]; skills?: string[];
}

export default function StudentProfile() {
  const token = useAuth((s) => s.accessToken) ?? undefined;
  const { data } = useQuery({ queryKey: ['me-profile'], queryFn: () => api.get<MeProfile>('/users/me', token), enabled: !!token });
  const [p, setP] = useState<MeProfile>({});
  const [saved, setSaved] = useState(false);
  useEffect(() => { if (data) setP(data); }, [data]);

  const setAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.size > 600_000) { alert('Image must be under 600KB'); return; }
    const r = new FileReader(); r.onload = () => setP({ ...p, avatarUrl: String(r.result) }); r.readAsDataURL(f);
  };
  const save = async () => {
    await api.patch('/users/me', {
      name: p.name, avatarUrl: p.avatarUrl, bio: p.bio, educationLevel: p.educationLevel, programme: p.programme,
      subjects: p.subjects, interests: p.interests,
    }, token);
    setSaved(true); setTimeout(() => setSaved(false), 2500);
  };
  const list = (k: 'subjects' | 'interests') => (e: React.ChangeEvent<HTMLInputElement>) =>
    setP({ ...p, [k]: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) });

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="inline-flex items-center gap-2 text-2xl font-bold text-ink"><UserCircle className="h-6 w-6 text-brand" /> My profile</h1>

      <Card className="flex items-center gap-4">
        {p.avatarUrl ? <img src={p.avatarUrl} alt="" className="h-20 w-20 rounded-2xl object-cover" /> : <span className="grid h-20 w-20 place-items-center rounded-2xl bg-brand-soft text-2xl font-black text-brand">{p.name?.[0] ?? 'S'}</span>}
        <div>
          <p className="font-semibold text-ink">{p.name}</p><p className="text-sm text-ink-soft">{p.email}</p>
          <label className="mt-1 inline-flex cursor-pointer items-center gap-1 rounded-xl border border-gray-200 px-3 py-1.5 text-sm font-medium hover:border-brand"><Upload className="h-4 w-4" /> Upload photo<input type="file" accept="image/*" className="hidden" onChange={setAvatar} /></label>
        </div>
      </Card>

      <Card className="space-y-3">
        <label className="block text-sm">Full name<input value={p.name ?? ''} onChange={(e) => setP({ ...p, name: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" /></label>
        <label className="block text-sm">About me<textarea value={p.bio ?? ''} onChange={(e) => setP({ ...p, bio: e.target.value })} rows={3} placeholder="A little about you, your goals…" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">Education level<select value={p.educationLevel ?? ''} onChange={(e) => setP({ ...p, educationLevel: e.target.value, programme: '' })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"><option value="">—</option>{LEVELS.map((l) => <option key={l}>{l}</option>)}</select></label>
          {p.educationLevel === 'SHS' && <label className="block text-sm">SHS programme<select value={p.programme ?? ''} onChange={(e) => setP({ ...p, programme: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"><option value="">—</option>{SHS_PROGRAMMES.map((pr) => <option key={pr}>{pr}</option>)}</select></label>}
          {['Undergraduate', 'Postgraduate', 'PhD'].includes(p.educationLevel ?? '') && <label className="block text-sm">Programme / course<input value={p.programme ?? ''} onChange={(e) => setP({ ...p, programme: e.target.value })} placeholder="e.g. BSc Computer Science" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" /></label>}
          <label className="block text-sm sm:col-span-2">Subjects (comma-separated)<input value={(p.subjects ?? []).join(', ')} onChange={list('subjects')} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" /></label>
          <label className="block text-sm sm:col-span-2">Interests (comma-separated)<input value={(p.interests ?? []).join(', ')} onChange={list('interests')} placeholder="e.g. robotics, medicine, music" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" /></label>
        </div>
        {p.educationLevel && subjectsFor(p.educationLevel, p.programme).length > 0 && (
          <div className="rounded-xl bg-brand-soft/50 p-3">
            <p className="text-xs font-medium text-ink">Suggested subjects for {p.educationLevel}{p.programme ? ` · ${p.programme}` : ''}:</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {subjectsFor(p.educationLevel, p.programme).map((subj) => {
                const on = (p.subjects ?? []).includes(subj);
                return <button key={subj} onClick={() => setP({ ...p, subjects: on ? (p.subjects ?? []).filter((x) => x !== subj) : [...(p.subjects ?? []), subj] })} className={`rounded-lg px-2 py-0.5 text-xs font-medium ${on ? 'bg-brand text-white' : 'border border-gray-200 text-ink-soft hover:border-brand'}`}>{on ? '✓ ' : '+ '}{subj}</button>;
              })}
            </div>
          </div>
        )}
      </Card>

      <button onClick={save} className="inline-flex items-center gap-1 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white"><Save className="h-4 w-4" /> {saved ? 'Saved ✓' : 'Save profile'}</button>
      <p className="text-xs text-ink-soft">Your interests help tailor exam prep, labs and recommendations. Photo stored inline (under 600KB).</p>
    </div>
  );
}
