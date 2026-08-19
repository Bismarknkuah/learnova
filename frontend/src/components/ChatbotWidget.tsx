'use client';
import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';

interface Msg { role: 'user' | 'bot'; text: string }

/** Floating AI assistant available to every signed-in user. Uses the inbuilt /ai/ask. */
export function ChatbotWidget() {
  const token = useAuth((s) => s.accessToken);
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ role: 'bot', text: "Hi! I'm Nova, your Learnova assistant. Ask me anything about your studies." }]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => { endRef.current?.scrollIntoView(); }, [msgs, open]);

  if (!token) return null;

  const send = async () => {
    if (!input.trim() || busy) return;
    const q = input; setInput('');
    setMsgs((m) => [...m, { role: 'user', text: q }]); setBusy(true);
    try {
      const r = await api.post<{ answer?: string }>('/ai/ask', { question: q }, token);
      setMsgs((m) => [...m, { role: 'bot', text: r.answer || "I'm still learning that one." }]);
    } catch (e) {
      setMsgs((m) => [...m, { role: 'bot', text: `Sorry, something went wrong: ${(e as Error).message}` }]);
    } finally { setBusy(false); }
  };

  return (
    <>
      {!open && (
        <button onClick={() => setOpen(true)} className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-xl shadow-brand/30 transition hover:scale-105">
          <MessageCircle className="h-6 w-6" />
        </button>
      )}
      {open && (
        <div className="fixed bottom-5 right-5 z-40 flex h-[28rem] w-[min(92vw,22rem)] flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between bg-gradient-to-r from-brand to-brand-dark px-4 py-3 text-white">
            <p className="inline-flex items-center gap-2 font-bold"><Sparkles className="h-4 w-4" /> Nova Assistant</p>
            <button onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto bg-gray-50/60 p-3">
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <span className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${m.role === 'user' ? 'bg-brand text-white' : 'border border-gray-200 bg-white text-ink'}`}>{m.text}</span>
              </div>
            ))}
            {busy && <p className="text-xs text-ink-soft">Nova is thinking…</p>}
            <div ref={endRef} />
          </div>
          <div className="flex gap-2 border-t border-gray-100 p-2">
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') send(); }} placeholder="Ask Nova…" className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand" />
            <button onClick={send} disabled={busy || !input.trim()} className="rounded-xl bg-brand px-3 text-white"><Send className="h-5 w-5" /></button>
          </div>
        </div>
      )}
    </>
  );
}
