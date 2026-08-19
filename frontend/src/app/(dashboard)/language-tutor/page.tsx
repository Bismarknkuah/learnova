'use client';
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Mic, MicOff, Send, Volume2, Languages } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';

interface Lang { id: string; native: string }
type Turn = { role: 'tutor' | 'student'; content: string };
// BCP-47 codes for browser speech (Ghanaian languages may be unsupported → typing still works).
const SPEECH: Record<string, string> = { english: 'en-US', french: 'fr-FR', spanish: 'es-ES', arabic: 'ar-SA', twi: 'ak', hausa: 'ha' };

export default function LanguageTutor() {
  const token = useAuth((s) => s.accessToken) ?? undefined;
  const { data: langs } = useQuery({ queryKey: ['langs'], queryFn: () => api.get<Lang[]>('/ai/language-tutor/languages', token), enabled: !!token });
  const [language, setLanguage] = useState('twi');
  const [history, setHistory] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const recogRef = useRef<unknown>(null);

  const speak = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(text.replace(/\[[^\]]*\]/g, ''));
    u.lang = SPEECH[language] ?? 'en-US';
    window.speechSynthesis.speak(u);
  };

  const send = async (text: string) => {
    if (!text.trim()) return;
    const h: Turn[] = [...history, { role: 'student', content: text }];
    setHistory(h); setInput(''); setBusy(true);
    try {
      const r = await api.post<{ reply: string }>('/ai/language-tutor', { language, message: text, history: h.map(({ role, content }) => ({ role, content })) }, token);
      setHistory([...h, { role: 'tutor', content: r.reply }]); speak(r.reply);
    } finally { setBusy(false); }
  };

  const startTutor = async () => {
    setHistory([]); setBusy(true);
    try { const r = await api.post<{ reply: string }>('/ai/language-tutor', { language, history: [] }, token); setHistory([{ role: 'tutor', content: r.reply }]); speak(r.reply); }
    finally { setBusy(false); }
  };
  useEffect(() => { if (langs) startTutor(); /* eslint-disable-next-line */ }, [language, langs]);

  const toggleMic = () => {
    const SR = (window as unknown as { SpeechRecognition?: new () => unknown; webkitSpeechRecognition?: new () => unknown });
    const Ctor = SR.SpeechRecognition ?? SR.webkitSpeechRecognition;
    if (!Ctor) { alert('Voice input is not supported in this browser — please type.'); return; }
    if (listening) { (recogRef.current as { stop: () => void })?.stop(); setListening(false); return; }
    const recog = new Ctor() as { lang: string; onresult: (e: unknown) => void; onend: () => void; start: () => void; stop: () => void };
    recog.lang = SPEECH[language] ?? 'en-US';
    recog.onresult = (e: unknown) => { const ev = e as { results: { [k: number]: { [k: number]: { transcript: string } } } }; const text = ev.results[0][0].transcript; setInput(text); send(text); };
    recog.onend = () => setListening(false);
    recogRef.current = recog; recog.start(); setListening(true);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="inline-flex items-center gap-2 text-2xl font-bold text-ink"><Languages className="h-6 w-6 text-brand" /> AI Language Tutor</h1>
        <select value={language} onChange={(e) => setLanguage(e.target.value)} className="rounded-xl border border-gray-300 px-3 py-2 text-sm">
          {langs?.map((l) => <option key={l.id} value={l.id}>{l.native}</option>)}
        </select>
      </div>

      <div className="space-y-3">
        {history.map((t, i) => (
          <div key={i} className={t.role === 'tutor' ? '' : 'ml-10'}>
            <Card className={t.role === 'tutor' ? 'bg-brand-soft/40' : ''}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-ink">{t.content}</p>
                {t.role === 'tutor' && <button onClick={() => speak(t.content)} className="shrink-0 text-brand"><Volume2 className="h-4 w-4" /></button>}
              </div>
            </Card>
          </div>
        ))}
        {busy && <p className="text-sm text-ink-soft">…</p>}
      </div>

      <div className="flex gap-2">
        <button onClick={toggleMic} className={`rounded-xl p-2.5 ${listening ? 'bg-coral text-white' : 'bg-gray-100'}`}>{listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}</button>
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') send(input); }} placeholder="Speak or type…" className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand" />
        <button onClick={() => send(input)} disabled={busy || !input.trim()} className="rounded-xl bg-brand px-4 text-white"><Send className="h-5 w-5" /></button>
      </div>
      <p className="text-xs text-ink-soft">Voice input/output works best for English, French, Spanish and Arabic. Twi, Ga, Fante, Sefwi, Kusaal and others are fully supported in text; spoken support depends on your device’s voices.</p>
    </div>
  );
}
