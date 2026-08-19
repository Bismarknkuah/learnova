'use client';
import { useState } from 'react';
import { Sparkles, BadgeCheck, Send, ArrowLeft } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';
import { useTutors } from '@/features/tutors/useTutors';

interface Msg { role: 'user' | 'ai'; text: string }
interface Answer { answer: string; citations?: { ref: number; source: string }[] }

const initials = (n: string) => n.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

export default function TwinPage() {
  const token = useAuth((s) => s.accessToken) ?? undefined;
  const { data: tutors } = useTutors({});
  const twins = (tutors ?? []).filter((t) => t.aiTwinEnabled);

  const [active, setActive] = useState<{ id: string; name: string } | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);

  const ask = async () => {
    if (!q.trim() || !active) return;
    const text = q;
    setMessages((m) => [...m, { role: 'user', text }]); setQ(''); setBusy(true);
    try {
      const r = await api.post<Answer>('/ai/ask', { question: text, twinId: active.id }, token);
      setMessages((m) => [...m, { role: 'ai', text: r.answer }]);
    } catch (e) {
      setMessages((m) => [...m, { role: 'ai', text: `Sorry — ${(e as Error).message}` }]);
    } finally { setBusy(false); }
  };

  // Picker
  if (!active) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-ink">Ask a teacher’s AI Twin</h1>
          <p className="text-sm text-ink-soft">Study 24/7 with an AI trained on your teacher’s own lessons and style.</p>
        </div>
        {twins.length === 0 ? (
          <Card><p className="text-ink-soft">No AI Twins are available yet. Teachers enable their Twin after uploading lessons.</p></Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {twins.map((t) => (
              <button key={t.id} onClick={() => { setActive({ id: t.id, name: t.name }); setMessages([]); }}
                className="group flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-card transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lift">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 font-bold text-white">{initials(t.name)}</span>
                <div>
                  <div className="flex items-center gap-1"><h3 className="font-bold text-ink">{t.name}</h3>{t.ghanaCardVerified && <BadgeCheck className="h-4 w-4 text-brand" />}</div>
                  <p className="text-sm text-ink-soft">{t.subjects?.slice(0, 2).join(', ')}</p>
                  <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-600"><Sparkles className="h-3 w-3" /> Ask {t.name.split(' ')[0]} AI</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Chat
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <button onClick={() => setActive(null)} className="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-brand"><ArrowLeft className="h-4 w-4" /> All twins</button>
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 font-bold text-white">{initials(active.name)}</span>
        <div><h1 className="text-xl font-bold text-ink">{active.name} AI</h1><p className="text-sm text-ink-soft">Grounded in {active.name.split(' ')[0]}’s lessons</p></div>
      </div>
      <Card className="min-h-[280px] space-y-4">
        {messages.length === 0 && <p className="text-ink-soft">Ask {active.name.split(' ')[0]} anything — e.g. “Explain projectile motion like in your class”.</p>}
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
            <span className={`inline-block max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${m.role === 'user' ? 'bg-brand text-white' : 'bg-gray-100 text-ink'}`}>{m.text}</span>
          </div>
        ))}
        {busy && <p className="text-sm text-ink-soft">Thinking…</p>}
      </Card>
      <div className="flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') ask(); }}
          placeholder={`Ask ${active.name.split(' ')[0]} AI…`}
          className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
        <button onClick={ask} disabled={busy || !q.trim()} className="inline-flex items-center gap-1 rounded-xl bg-brand px-4 py-2.5 font-semibold text-white hover:bg-brand-dark disabled:opacity-50"><Send className="h-4 w-4" /> Ask</button>
      </div>
    </div>
  );
}
