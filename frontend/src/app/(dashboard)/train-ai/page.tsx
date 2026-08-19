'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Brain, Coins, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';

interface Task { _id: string; question: string; subject?: string; level?: string; rewardGHS?: number }

export default function TrainAI() {
  const token = useAuth((s) => s.accessToken) ?? undefined;
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['train-next'], queryFn: () => api.get<{ task: Task | null; remaining: number }>('/ai/training/next', token), enabled: !!token });
  const [answer, setAnswer] = useState('');
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!data?.task || answer.trim().length < 10) return;
    setBusy(true);
    try {
      const r = await api.post<{ message: string }>(`/ai/training/${data.task._id}/submit`, { answer }, token);
      setDone(r.message); setAnswer('');
      qc.invalidateQueries({ queryKey: ['train-next'] });
    } catch (e) { setDone(`Error: ${(e as Error).message}`); } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="inline-flex items-center gap-2 text-2xl font-bold text-ink"><Brain className="h-6 w-6 text-violet-600" /> Train the AI — earn as you teach</h1>
        <p className="text-sm text-ink-soft">Answer a subject question accurately. You earn <span className="font-semibold text-brand">₵0.20</span> per task, and the inbuilt assistant learns from your answer.</p>
      </div>

      <Card className="flex items-center justify-between bg-gradient-to-r from-violet-50 to-brand-soft">
        <span className="inline-flex items-center gap-2 font-semibold text-ink"><Coins className="h-5 w-5 text-gold-dark" /> ₵0.20 per accurate answer</span>
        <span className="text-sm text-ink-soft">{data?.remaining ?? 0} tasks available</span>
      </Card>

      {done && <Card className="border-brand/30 bg-brand-soft/50"><p className="inline-flex items-center gap-2 text-sm font-medium text-brand"><CheckCircle2 className="h-5 w-5" /> {done}</p></Card>}

      {data?.task ? (
        <Card className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {data.task.subject && <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-ink-soft">{data.task.subject}</span>}
            {data.task.level && <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-ink-soft">{data.task.level}</span>}
          </div>
          <p className="text-lg font-semibold text-ink">{data.task.question}</p>
          <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={6} placeholder="Write a clear, accurate answer a student would understand…" className="w-full rounded-xl border border-gray-300 p-3 text-sm outline-none focus:border-brand" />
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-soft">{answer.trim().length < 10 ? 'Write at least a sentence.' : 'Looks good!'}</span>
            <button onClick={submit} disabled={busy || answer.trim().length < 10} className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Submitting…' : 'Submit & earn ₵0.20'}</button>
          </div>
        </Card>
      ) : (
        <Card><p className="text-ink-soft">No training tasks right now — check back soon. 🎉</p></Card>
      )}
      <p className="text-xs text-ink-soft">Earnings are added to your balance and appear under Earnings.</p>
    </div>
  );
}
