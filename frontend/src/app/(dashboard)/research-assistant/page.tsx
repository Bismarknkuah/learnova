'use client';
import { useState } from 'react';
import { BookMarked, Quote, Lightbulb, FileText, Loader2, Copy } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';

type Tool = 'lit_review' | 'citation' | 'gap' | 'summarize';
const TOOLS: { id: Tool; label: string; icon: typeof BookMarked; desc: string }[] = [
  { id: 'lit_review', label: 'Literature review', icon: BookMarked, desc: 'Themes & sources to review for a topic.' },
  { id: 'citation', label: 'Citation generator', icon: Quote, desc: 'Format references in APA / MLA / Harvard.' },
  { id: 'gap', label: 'Research gaps', icon: Lightbulb, desc: 'Find open questions in a topic or abstract.' },
  { id: 'summarize', label: 'Paper summary', icon: FileText, desc: 'Summarise a paper or excerpt.' },
];

export default function ResearchAssistant() {
  const token = useAuth((s) => s.accessToken) ?? undefined;
  const [tool, setTool] = useState<Tool>('lit_review');
  const [topic, setTopic] = useState('');
  const [text, setText] = useState('');
  const [cit, setCit] = useState({ authors: '', title: '', year: '', source: '', url: '' });
  const [style, setStyle] = useState<'APA' | 'MLA' | 'Harvard'>('APA');
  const [result, setResult] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true); setResult('');
    try {
      const body: Record<string, unknown> = { tool };
      if (tool === 'citation') { body.citation = cit; body.style = style; }
      else if (tool === 'summarize') body.text = text;
      else body.topic = topic;
      const r = await api.post<{ result: string }>('/ai/research', body, token);
      setResult(r.result);
    } catch (e) { setResult((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div><h1 className="text-2xl font-bold text-ink">AI Research Assistant</h1><p className="text-sm text-ink-soft">Literature reviews, citations, research gaps & summaries.</p></div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {TOOLS.map((t) => (
          <button key={t.id} onClick={() => { setTool(t.id); setResult(''); }} className={`rounded-xl border p-3 text-left ${tool === t.id ? 'border-brand bg-brand-soft' : 'border-gray-200 hover:border-brand'}`}>
            <t.icon className={`h-5 w-5 ${tool === t.id ? 'text-brand' : 'text-ink-soft'}`} />
            <p className="mt-1 text-sm font-semibold text-ink">{t.label}</p>
          </button>
        ))}
      </div>

      <Card className="space-y-3">
        <p className="text-sm text-ink-soft">{TOOLS.find((t) => t.id === tool)?.desc}</p>
        {tool === 'citation' ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <input placeholder="Authors (e.g. Mensah, K.)" value={cit.authors} onChange={(e) => setCit({ ...cit, authors: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <input placeholder="Title" value={cit.title} onChange={(e) => setCit({ ...cit, title: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <input placeholder="Year" value={cit.year} onChange={(e) => setCit({ ...cit, year: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <input placeholder="Source / journal" value={cit.source} onChange={(e) => setCit({ ...cit, source: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <input placeholder="URL (optional)" value={cit.url} onChange={(e) => setCit({ ...cit, url: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm sm:col-span-2" />
            <select value={style} onChange={(e) => setStyle(e.target.value as 'APA' | 'MLA' | 'Harvard')} className="rounded-lg border border-gray-300 px-3 py-2 text-sm"><option>APA</option><option>MLA</option><option>Harvard</option></select>
          </div>
        ) : tool === 'summarize' ? (
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} placeholder="Paste the paper text or abstract…" className="w-full rounded-xl border border-gray-300 p-3 text-sm outline-none focus:border-brand" />
        ) : (
          <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Research topic…" className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand" />
        )}
        <button onClick={run} disabled={busy} className="inline-flex items-center gap-1 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white">{busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Working…</> : 'Run'}</button>
      </Card>

      {result && (
        <Card>
          <button onClick={() => navigator.clipboard.writeText(result)} className="mb-2 inline-flex items-center gap-1 text-sm text-brand"><Copy className="h-3.5 w-3.5" /> Copy</button>
          <pre className="whitespace-pre-wrap text-sm text-ink">{result}</pre>
        </Card>
      )}
    </div>
  );
}
