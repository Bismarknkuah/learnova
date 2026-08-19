'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap, Sparkles, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';

const TRACKS = [
  { id: 'BECE', name: 'BECE', desc: 'Basic Education Certificate — JHS leavers.', subjects: ['Mathematics', 'Integrated Science', 'English'] },
  { id: 'WASSCE', name: 'WASSCE', desc: 'West African Senior School Certificate.', subjects: ['Physics', 'Chemistry', 'Mathematics', 'English'] },
  { id: 'GRE', name: 'GRE', desc: 'Graduate Record Examination.', subjects: ['Quantitative', 'Verbal'] },
  { id: 'SAT', name: 'SAT', desc: 'US college admissions test.', subjects: ['Math', 'Reading & Writing'] },
  { id: 'IELTS', name: 'IELTS', desc: 'International English Language Testing.', subjects: ['Reading', 'Listening', 'Grammar'] },
  { id: 'TOEFL', name: 'TOEFL', desc: 'Test of English as a Foreign Language.', subjects: ['Vocabulary', 'Grammar'] },
];

export default function ExamPrep() {
  const token = useAuth((s) => s.accessToken) ?? undefined;
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [subjectByTrack, setSubjectByTrack] = useState<Record<string, string>>({});

  const generate = async (track: string) => {
    setBusy(track);
    try {
      const exam = await api.post<{ _id: string }>('/exams/generate', { track, subject: subjectByTrack[track], count: 10 }, token);
      router.push(`/exams/${exam._id}`);
    } catch (e) { alert((e as Error).message); } finally { setBusy(null); }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="inline-flex items-center gap-2 text-2xl font-bold text-ink"><GraduationCap className="h-6 w-6 text-brand" /> National Exam Prep Center</h1>
        <p className="text-sm text-ink-soft">Dedicated tracks with AI-generated practice examinations.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TRACKS.map((t) => (
          <Card key={t.id} className="flex flex-col">
            <span className="inline-flex w-fit items-center rounded-lg bg-brand-soft px-2 py-0.5 text-xs font-bold text-brand">{t.name}</span>
            <p className="mt-2 text-sm text-ink-soft">{t.desc}</p>
            <select value={subjectByTrack[t.id] ?? ''} onChange={(e) => setSubjectByTrack((p) => ({ ...p, [t.id]: e.target.value }))}
              className="mt-3 rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="">Mixed paper</option>
              {t.subjects.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button onClick={() => generate(t.id)} disabled={busy === t.id}
              className="mt-3 inline-flex items-center justify-center gap-1 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white">
              {busy === t.id ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</> : <><Sparkles className="h-4 w-4" /> Generate practice exam</>}
            </button>
          </Card>
        ))}
      </div>
      <p className="text-xs text-ink-soft">Questions are AI-generated when an Anthropic key is set; otherwise drawn from a built-in question bank per track.</p>
    </div>
  );
}
