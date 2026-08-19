'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, ClipboardList, FileCheck2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';
import { useMe } from '@/features/profile/useMe';

interface Exam { _id: string; title: string; track: string; subject?: string; durationMin: number; proctored: boolean }
interface QForm { prompt: string; options: string[]; answerIndex: number; marks: number }

export default function ExamsPage() {
  const token = useAuth((s) => s.accessToken) ?? undefined;
  const { data: me } = useMe();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['exams'], queryFn: () => api.get<Exam[]>('/exams', token), enabled: !!token });
  const canCreate = me?.role === 'teacher' || me?.role === 'school_admin' || me?.role === 'super_admin';
  const [building, setBuilding] = useState(false);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-ink">Exams & assignments</h1><p className="text-sm text-ink-soft">{canCreate ? 'Set tasks for your students and grade them automatically.' : 'Take your assigned exams and assignments.'}</p></div>
        {canCreate && <button onClick={() => setBuilding((v) => !v)} className="inline-flex items-center gap-1 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" /> Create</button>}
      </div>

      {building && canCreate && <Builder token={token} onDone={() => { setBuilding(false); qc.invalidateQueries({ queryKey: ['exams'] }); }} />}

      <div className="grid gap-4 sm:grid-cols-2">
        {data?.map((e) => (
          <Card key={e._id}>
            <div className="flex items-start justify-between">
              <span className="inline-flex items-center gap-1 rounded-md bg-brand-soft px-2 py-0.5 text-xs font-semibold uppercase text-brand">{e.track}</span>
              {e.proctored && <span className="text-xs font-medium text-coral">Proctored</span>}
            </div>
            <h3 className="mt-2 font-bold text-ink">{e.title}</h3>
            <p className="text-sm text-ink-soft">{e.subject} · {e.durationMin} min</p>
            <Link href={`/exams/${e._id}`} className="mt-3 inline-flex items-center gap-1 rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white">
              {canCreate ? <><FileCheck2 className="h-4 w-4" /> Preview</> : <><ClipboardList className="h-4 w-4" /> Start</>}
            </Link>
          </Card>
        ))}
        {!data?.length && <p className="text-ink-soft">No exams or assignments yet.</p>}
      </div>
    </div>
  );
}

function Builder({ token, onDone }: { token?: string; onDone: () => void }) {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [durationMin, setDuration] = useState(30);
  const [proctored, setProctored] = useState(false);
  const [qs, setQs] = useState<QForm[]>([{ prompt: '', options: ['', ''], answerIndex: 0, marks: 1 }]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const addQ = () => setQs([...qs, { prompt: '', options: ['', ''], answerIndex: 0, marks: 1 }]);
  const rmQ = (i: number) => setQs(qs.filter((_, k) => k !== i));
  const setQ = (i: number, patch: Partial<QForm>) => setQs(qs.map((q, k) => (k === i ? { ...q, ...patch } : q)));
  const addOpt = (i: number) => setQ(i, { options: [...qs[i].options, ''] });
  const setOpt = (i: number, j: number, v: string) => setQ(i, { options: qs[i].options.map((o, k) => (k === j ? v : o)) });

  const valid = title.trim().length >= 2 && qs.every((q) => q.prompt.trim() && q.options.filter((o) => o.trim()).length >= 2);

  const save = async () => {
    setErr(''); setBusy(true);
    try {
      await api.post('/exams', {
        title, track: 'custom', subject: subject || undefined, durationMin, proctored,
        questions: qs.map((q) => ({ prompt: q.prompt, options: q.options.filter((o) => o.trim()), answerIndex: q.answerIndex, marks: q.marks })),
      }, token);
      onDone();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <Card className="space-y-3">
      <h3 className="font-semibold text-ink">New exam / assignment</h3>
      <div className="grid gap-2 sm:grid-cols-2">
        <input placeholder="Title (e.g. Physics Test 1)" value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        <input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        <label className="flex items-center gap-2 text-sm text-ink-soft">Duration (min) <input type="number" value={durationMin} onChange={(e) => setDuration(Number(e.target.value))} className="w-20 rounded-lg border border-gray-300 px-2 py-1" /></label>
        <label className="flex items-center gap-2 text-sm text-ink-soft"><input type="checkbox" checked={proctored} onChange={(e) => setProctored(e.target.checked)} /> Proctored (AI monitoring)</label>
      </div>

      <div className="space-y-3">
        {qs.map((q, i) => (
          <div key={i} className="rounded-xl border border-gray-200 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-ink">Question {i + 1}</span>
              {qs.length > 1 && <button onClick={() => rmQ(i)} className="text-coral"><Trash2 className="h-4 w-4" /></button>}
            </div>
            <input placeholder="Question prompt" value={q.prompt} onChange={(e) => setQ(i, { prompt: e.target.value })} className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <p className="mt-2 text-xs text-ink-soft">Options (tap the circle to mark the correct answer):</p>
            <div className="mt-1 space-y-1.5">
              {q.options.map((o, j) => (
                <div key={j} className="flex items-center gap-2">
                  <button onClick={() => setQ(i, { answerIndex: j })} className={`h-4 w-4 shrink-0 rounded-full border-2 ${q.answerIndex === j ? 'border-brand bg-brand' : 'border-gray-300'}`} title="Mark correct" />
                  <input placeholder={`Option ${j + 1}`} value={o} onChange={(e) => setOpt(i, j, e.target.value)} className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm" />
                </div>
              ))}
            </div>
            <button onClick={() => addOpt(i)} className="mt-1.5 text-xs font-medium text-brand">+ Add option</button>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <button onClick={addQ} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium hover:border-brand"><Plus className="h-4 w-4" /> Add question</button>
        <button onClick={save} disabled={!valid || busy} className="rounded-xl bg-brand px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Saving…' : 'Publish to students'}</button>
      </div>
      {err && <p className="text-sm text-coral">{err}</p>}
      {!valid && <p className="text-xs text-ink-soft">Add a title, and each question needs a prompt and at least 2 options.</p>}
    </Card>
  );
}
