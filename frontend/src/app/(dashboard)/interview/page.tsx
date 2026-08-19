'use client';
import { useState } from 'react';
import { Briefcase, Award, GraduationCap, Send, Sparkles, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';

type Turn = { role: 'interviewer' | 'candidate'; content: string; feedback?: string };
const TYPES = [
  { id: 'job', label: 'Job', icon: Briefcase },
  { id: 'scholarship', label: 'Scholarship', icon: Award },
  { id: 'admission', label: 'Admission', icon: GraduationCap },
] as const;

export default function InterviewPage() {
  const token = useAuth((s) => s.accessToken) ?? undefined;
  const [type, setType] = useState<'job' | 'scholarship' | 'admission' | null>(null);
  const [history, setHistory] = useState<Turn[]>([]);
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const ask = async (h: Turn[]) => {
    setBusy(true);
    try {
      const r = await api.post<{ question?: string; feedback?: string; done?: boolean }>('/ai/interview',
        { type, history: h.map(({ role, content }) => ({ role, content })) }, token);
      if (r.feedback && h.length) h[h.length - 1] = { ...h[h.length - 1], feedback: r.feedback };
      if (r.question) h = [...h, { role: 'interviewer', content: r.question }];
      setHistory([...h]);
      setDone(!!r.done);
    } finally { setBusy(false); }
  };

  const start = async (t: 'job' | 'scholarship' | 'admission') => { setType(t); setHistory([]); setDone(false); await ask([]); };
  const submit = async () => {
    if (!answer.trim()) return;
    const h: Turn[] = [...history, { role: 'candidate', content: answer }];
    setHistory(h); setAnswer('');
    await ask(h);
  };

  if (!type) return (
    <div className="space-y-5">
      <div><h1 className="inline-flex items-center gap-2 text-2xl font-bold text-ink"><Sparkles className="h-6 w-6 text-violet-600" /> AI Interview Simulator</h1><p className="text-sm text-ink-soft">Practice mock interviews and get instant feedback.</p></div>
      <div className="grid gap-4 sm:grid-cols-3">
        {TYPES.map((t) => (
          <Card key={t.id} className="cursor-pointer hover:border-brand" >
            <button onClick={() => start(t.id)} className="w-full text-left">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-soft text-brand"><t.icon className="h-5 w-5" /></span>
              <h3 className="mt-2 font-bold text-ink">{t.label} interview</h3>
              <p className="text-sm text-ink-soft">Start a {t.label.toLowerCase()} mock interview.</p>
            </button>
          </Card>
        ))}
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink capitalize">{type} mock interview</h1>
        <button onClick={() => setType(null)} className="inline-flex items-center gap-1 text-sm text-brand"><RefreshCw className="h-4 w-4" /> Restart</button>
      </div>
      <div className="space-y-3">
        {history.map((t, i) => (
          <div key={i}>
            {t.role === 'interviewer'
              ? <Card className="bg-brand-soft/40"><p className="text-sm font-medium text-ink">🎤 {t.content}</p></Card>
              : <div className="ml-8"><Card><p className="text-sm text-ink">{t.content}</p>{t.feedback && <p className="mt-2 rounded-lg bg-gold-soft px-2 py-1 text-xs text-gold-dark">💡 {t.feedback}</p>}</Card></div>}
          </div>
        ))}
      </div>
      {done ? <Card className="text-center text-sm text-ink-soft">Interview complete — restart to practice again.</Card> : (
        <div className="flex gap-2">
          <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={2} placeholder="Type your answer…" className="flex-1 rounded-xl border border-gray-300 p-3 text-sm outline-none focus:border-brand" />
          <button onClick={submit} disabled={busy || !answer.trim()} className="rounded-xl bg-brand px-4 text-white"><Send className="h-5 w-5" /></button>
        </div>
      )}
    </div>
  );
}
