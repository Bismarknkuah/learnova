'use client';
import { useState } from 'react';
import { Upload, ShieldAlert, Lightbulb, CheckCircle2, FileText } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';

interface Review {
  plagiarism: { score: number; matchedId?: string };
  feedback: string[]; hints: string[]; corrections: string[];
}

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export default function WorkspacePage() {
  const token = useAuth((s) => s.accessToken) ?? undefined;
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');
  const [res, setRes] = useState<Review | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [extracting, setExtracting] = useState(false);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setFileName(f.name); setNote('');
    // Plain text reads instantly in-browser.
    if (f.type.startsWith('text/') || /\.(txt|md|csv)$/i.test(f.name)) { setText(await f.text()); return; }
    // PDF / Word are extracted server-side.
    setExtracting(true);
    try {
      const fd = new FormData(); fd.append('file', f);
      const r = await fetch(`${API}/api/v1/assignments/extract`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
      const j = await r.json();
      if (!r.ok) { setNote(j.error ?? 'Could not extract text from that file.'); return; }
      setText(j.data.text);
      setNote(`Extracted ${j.data.chars.toLocaleString()} characters from your ${j.data.kind.toUpperCase()}.`);
    } catch { setNote('Extraction failed — please paste the text instead.'); }
    finally { setExtracting(false); }
  };

  const review = async () => {
    setBusy(true); setNote('');
    try { setRes(await api.post<Review>('/assignments/review', { text }, token)); }
    catch (e) { setNote(`Review failed: ${(e as Error).message}`); }
    finally { setBusy(false); }
  };

  const risk = res ? (res.plagiarism.score >= 60 ? 'high' : res.plagiarism.score >= 30 ? 'medium' : 'low') : 'low';

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink">AI Assignment Workspace</h1>
        <p className="text-sm text-ink-soft">Upload or paste your work — get feedback, hints, corrections, and a plagiarism check.</p>
      </div>

      <Card className="space-y-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-ink-soft hover:border-brand">
          <Upload className="h-4 w-4" /> {extracting ? 'Extracting text…' : (fileName || 'Upload a PDF, Word (.docx) or text file — or paste below')}
          <input type="file" hidden accept=".txt,.md,.csv,.pdf,.doc,.docx,image/*" onChange={onFile} />
        </label>
        {note && <p className="text-xs text-gold-dark">{note}</p>}
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={10}
          placeholder="Paste your essay, solution or report here…"
          className="w-full rounded-xl border border-gray-300 p-3 text-sm outline-none focus:border-brand" />
        <Button onClick={review} disabled={busy || text.trim().length < 20} className="w-full">
          {busy ? 'Reviewing…' : 'Review my work'}
        </Button>
      </Card>

      {res && (
        <div className="space-y-4">
          <Card>
            <div className="flex items-center justify-between">
              <p className="inline-flex items-center gap-2 font-semibold text-ink"><ShieldAlert className="h-5 w-5 text-coral" /> Plagiarism check</p>
              <span className={`rounded-full px-3 py-1 text-sm font-semibold ${risk === 'high' ? 'bg-coral-soft text-coral' : risk === 'medium' ? 'bg-gold-soft text-gold-dark' : 'bg-brand-soft text-brand'}`}>
                {res.plagiarism.score}% similar
              </span>
            </div>
            <p className="mt-1 text-sm text-ink-soft">{risk === 'high' ? 'High similarity to an existing submission — review your sources.' : risk === 'medium' ? 'Some overlap detected.' : 'Looks original.'}</p>
          </Card>

          {res.feedback.length > 0 && <Card><p className="inline-flex items-center gap-2 font-semibold text-ink"><FileText className="h-5 w-5 text-brand" /> Feedback</p><ul className="mt-1 ml-5 list-disc text-sm text-ink-soft">{res.feedback.map((f, i) => <li key={i}>{f}</li>)}</ul></Card>}
          {res.hints.length > 0 && <Card><p className="inline-flex items-center gap-2 font-semibold text-ink"><Lightbulb className="h-5 w-5 text-gold-dark" /> Hints</p><ul className="mt-1 ml-5 list-disc text-sm text-ink-soft">{res.hints.map((h, i) => <li key={i}>{h}</li>)}</ul></Card>}
          {res.corrections.length > 0 && <Card><p className="inline-flex items-center gap-2 font-semibold text-ink"><CheckCircle2 className="h-5 w-5 text-brand" /> Suggested corrections</p><ul className="mt-1 ml-5 list-disc text-sm text-ink-soft">{res.corrections.map((c, i) => <li key={i}>{c}</li>)}</ul></Card>}
        </div>
      )}
    </div>
  );
}
