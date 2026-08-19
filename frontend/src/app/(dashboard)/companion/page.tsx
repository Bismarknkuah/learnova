'use client';
import { useState } from 'react';
import { Sparkles, BookOpen, FileText, ListChecks, Layers, Calculator, Compass, CalendarRange, Send, type LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';
import { useMe } from '@/features/profile/useMe';

interface Msg { role: 'user' | 'ai'; text: string }
interface Answer { answer: string; citations?: { ref: number; source: string }[] }

type Capability = { label: string; icon: LucideIcon; prompt: (topic: string) => string };
const CAPS: Capability[] = [
  { label: 'Explain', icon: BookOpen, prompt: (t) => `Explain this clearly with a simple example: ${t}` },
  { label: 'Summarize', icon: FileText, prompt: (t) => `Summarize the key points of: ${t}` },
  { label: 'Quiz me', icon: ListChecks, prompt: (t) => `Give me a 5-question quiz on: ${t}. Number them and wait for my answers.` },
  { label: 'Flashcards', icon: Layers, prompt: (t) => `Create 8 question/answer flashcards on: ${t}` },
  { label: 'Solve', icon: Calculator, prompt: (t) => `Solve this step by step, showing your working: ${t}` },
  { label: 'Study plan', icon: CalendarRange, prompt: (t) => `Make a 1-week study plan for: ${t}` },
  { label: 'Recommend tutors', icon: Compass, prompt: (t) => `Recommend the kind of tutor I should look for to improve at: ${t}` },
];

export default function CompanionPage() {
  const token = useAuth((s) => s.accessToken) ?? undefined;
  const { data: me } = useMe();
  const [topic, setTopic] = useState('');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);

  const level = (me as { educationLevel?: string })?.educationLevel;
  const subjects = (me as { subjects?: string[] })?.subjects ?? [];

  const send = async (text: string) => {
    if (!text.trim()) return;
    setMessages((m) => [...m, { role: 'user', text }]);
    setTopic(''); setBusy(true);
    try {
      const r = await api.post<Answer>('/ai/ask', {
        question: text, subject: subjects[0], studentLevel: level,
      }, token);
      setMessages((m) => [...m, { role: 'ai', text: r.answer }]);
    } catch (e) {
      setMessages((m) => [...m, { role: 'ai', text: `Sorry — ${(e as Error).message}` }]);
    } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white"><Sparkles className="h-5 w-5" /></span>
        <div>
          <h1 className="text-2xl font-bold text-ink">Your AI Companion</h1>
          <p className="text-sm text-ink-soft">
            {level ? `Tuned for ${level}` : 'Your personal study buddy'}{subjects.length ? ` · ${subjects.slice(0, 3).join(', ')}` : ''}
          </p>
        </div>
      </div>

      {/* Capability chips */}
      <div className="flex flex-wrap gap-2">
        {CAPS.map((c) => (
          <button key={c.label} onClick={() => send(c.prompt(topic || subjects[0] || 'my current topic'))} disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-ink transition hover:border-brand hover:bg-brand-soft disabled:opacity-50">
            <c.icon className="h-4 w-4 text-brand" /> {c.label}
          </button>
        ))}
      </div>

      {/* Conversation */}
      <Card className="min-h-[280px] space-y-4">
        {messages.length === 0 && (
          <p className="text-ink-soft">Type a topic below, then tap a capability — or just ask me anything. For example: “Explain Newton’s second law”.</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
            <span className={`inline-block max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${m.role === 'user' ? 'bg-brand text-white' : 'bg-gray-100 text-ink'}`}>
              {m.text}
            </span>
          </div>
        ))}
        {busy && <p className="text-sm text-ink-soft">Thinking…</p>}
      </Card>

      {/* Input */}
      <div className="flex gap-2">
        <input
          value={topic} onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') send(topic); }}
          placeholder="Ask anything, or type a topic for the buttons above…"
          className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
        <button onClick={() => send(topic)} disabled={busy || !topic.trim()}
          className="inline-flex items-center gap-1 rounded-xl bg-brand px-4 py-2.5 font-semibold text-white hover:bg-brand-dark disabled:opacity-50">
          <Send className="h-4 w-4" /> Send
        </button>
      </div>
    </div>
  );
}
