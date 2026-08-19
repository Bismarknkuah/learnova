'use client';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { UserCircle, Upload, Plus, X, Save } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';

interface Profile {
  headline?: string; bio?: string; subjects?: string[]; hourlyRateGHS?: number;
  teachingStyle?: string; languages?: string[]; gender?: string; country?: string;
  avatarUrl?: string; photos?: string[]; rating?: number; reviewsCount?: number;
}

export default function TeacherProfile() {
  const token = useAuth((s) => s.accessToken) ?? undefined;
  const { data } = useQuery({ queryKey: ['my-tutor'], queryFn: () => api.get<Profile | null>('/tutors/me/profile', token), enabled: !!token });
  const [p, setP] = useState<Profile>({});
  const [saved, setSaved] = useState(false);
  useEffect(() => { if (data) setP(data); }, [data]);

  const toDataUrl = (f: File): Promise<string> => new Promise((res, rej) => { if (f.size > 600_000) { rej(new Error('Image must be under 600KB')); return; } const r = new FileReader(); r.onload = () => res(String(r.result)); r.readAsDataURL(f); });
  const setAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (!f) return; try { setP({ ...p, avatarUrl: await toDataUrl(f) }); } catch (err) { alert((err as Error).message); } };
  const addPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (!f) return; try { setP({ ...p, photos: [...(p.photos ?? []), await toDataUrl(f)] }); } catch (err) { alert((err as Error).message); } };
  const removePhoto = (i: number) => setP({ ...p, photos: (p.photos ?? []).filter((_, k) => k !== i) });

  const save = async () => {
    await api.patch('/tutors/me/profile', {
      headline: p.headline, bio: p.bio, subjects: p.subjects, hourlyRateGHS: p.hourlyRateGHS,
      teachingStyle: p.teachingStyle, languages: p.languages, gender: p.gender, country: p.country,
      avatarUrl: p.avatarUrl, photos: p.photos,
    }, token);
    setSaved(true); setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="inline-flex items-center gap-2 text-2xl font-bold text-ink"><UserCircle className="h-6 w-6 text-brand" /> My teaching profile</h1>

      <Card className="flex items-center gap-4">
        {p.avatarUrl ? <img src={p.avatarUrl} alt="" className="h-20 w-20 rounded-2xl object-cover" /> : <span className="grid h-20 w-20 place-items-center rounded-2xl bg-brand-soft text-2xl font-black text-brand">{p.headline?.[0] ?? 'T'}</span>}
        <div>
          <label className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium hover:border-brand"><Upload className="h-4 w-4" /> Upload photo<input type="file" accept="image/*" className="hidden" onChange={setAvatar} /></label>
          {p.rating ? <p className="mt-1 text-sm text-ink-soft">★ {p.rating.toFixed(1)} · {p.reviewsCount ?? 0} reviews</p> : null}
        </div>
      </Card>

      <Card className="space-y-3">
        <label className="block text-sm">Headline<input value={p.headline ?? ''} onChange={(e) => setP({ ...p, headline: e.target.value })} placeholder="e.g. WASSCE Physics & Maths specialist" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" /></label>
        <label className="block text-sm">About me<textarea value={p.bio ?? ''} onChange={(e) => setP({ ...p, bio: e.target.value })} rows={3} placeholder="Tell students about your experience and approach…" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">Subjects (comma-separated)<input value={(p.subjects ?? []).join(', ')} onChange={(e) => setP({ ...p, subjects: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" /></label>
          <label className="block text-sm">Languages (comma-separated)<input value={(p.languages ?? []).join(', ')} onChange={(e) => setP({ ...p, languages: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" /></label>
          <label className="block text-sm">Rate (₵/hour)<input type="number" value={p.hourlyRateGHS ?? ''} onChange={(e) => setP({ ...p, hourlyRateGHS: Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" /></label>
          <label className="block text-sm">Teaching style<select value={p.teachingStyle ?? ''} onChange={(e) => setP({ ...p, teachingStyle: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"><option value="">—</option><option value="exam-focused">Exam-focused</option><option value="conversational">Conversational</option><option value="practical">Practical</option></select></label>
          <label className="block text-sm">Country<input value={p.country ?? ''} onChange={(e) => setP({ ...p, country: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" /></label>
          <label className="block text-sm">Gender<select value={p.gender ?? ''} onChange={(e) => setP({ ...p, gender: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"><option value="">—</option><option value="male">Male</option><option value="female">Female</option></select></label>
        </div>
      </Card>

      <Card>
        <p className="mb-2 font-semibold text-ink">Photo gallery</p>
        <div className="flex flex-wrap gap-2">
          {(p.photos ?? []).map((src, i) => (
            <div key={i} className="relative"><img src={src} alt="" className="h-20 w-20 rounded-xl object-cover" /><button onClick={() => removePhoto(i)} className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-coral text-white"><X className="h-3 w-3" /></button></div>
          ))}
          <label className="grid h-20 w-20 cursor-pointer place-items-center rounded-xl border-2 border-dashed border-gray-300 text-gray-400 hover:border-brand"><Plus className="h-5 w-5" /><input type="file" accept="image/*" className="hidden" onChange={addPhoto} /></label>
        </div>
      </Card>

      <button onClick={save} className="inline-flex items-center gap-1 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white"><Save className="h-4 w-4" /> {saved ? 'Saved ✓' : 'Save profile'}</button>
      <p className="text-xs text-ink-soft">Photos are stored inline (keep under 600KB each).</p>
    </div>
  );
}
