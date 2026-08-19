'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Search, Bookmark, FileDown, Play, StickyNote } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';

interface Replay {
  title?: string; recording?: { url?: string }; transcript?: { text?: string };
  aiSummary?: string; keyPoints?: string[]; chapters?: { title: string; atMs: number }[]; unansweredQuestions?: string[];
}
interface ReplayNotes { bookmarks: { label: string; atMs: number }[]; notes: string }

const fmt = (ms: number) => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

export default function ReplayPage() {
  const { id } = useParams<{ id: string }>();
  const token = useAuth((s) => s.accessToken) ?? undefined;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { data } = useQuery({ queryKey: ['replay', id], queryFn: () => api.get<Replay>(`/classrooms/${id}/replay`, token), enabled: !!token });
  const { data: mine } = useQuery({ queryKey: ['replay-notes', id], queryFn: () => api.get<ReplayNotes>(`/classrooms/${id}/replay-notes`, token), enabled: !!token });

  const [q, setQ] = useState('');
  const [notes, setNotes] = useState('');
  const [bookmarks, setBookmarks] = useState<{ label: string; atMs: number }[]>([]);
  useEffect(() => { if (mine) { setNotes(mine.notes ?? ''); setBookmarks(mine.bookmarks ?? []); } }, [mine]);

  const jump = (ms: number) => { if (videoRef.current) { videoRef.current.currentTime = ms / 1000; videoRef.current.play().catch(() => {}); } };
  const save = (b = bookmarks, n = notes) => api.put(`/classrooms/${id}/replay-notes`, { bookmarks: b, notes: n }, token).catch(() => {});
  const addBookmark = () => {
    const atMs = Math.round((videoRef.current?.currentTime ?? 0) * 1000);
    const label = prompt('Note for this moment (synced across your devices):', `Note at ${fmt(atMs)}`);
    if (label == null) return;
    const b = [...bookmarks, { label, atMs }]; setBookmarks(b); save(b, notes);
  };

  // Transcript search: highlight matches
  const transcriptHits = useMemo(() => {
    const text = data?.transcript?.text ?? '';
    if (!q.trim()) return [];
    const sentences = text.split(/(?<=[.!?])\s+/);
    const dur = videoRef.current?.duration || 0;
    return sentences.map((s, i) => ({ s, i, total: sentences.length }))
      .filter(({ s }) => s.toLowerCase().includes(q.toLowerCase()))
      .slice(0, 20)
      .map((h) => ({ ...h, atMs: dur ? Math.round((h.i / h.total) * dur * 1000) : 0 }));
  }, [q, data]);

  const downloadPdf = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    let y = 18;
    const line = (t: string, size = 11, bold = false) => { doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size); doc.splitTextToSize(t, 175).forEach((l: string) => { if (y > 280) { doc.addPage(); y = 18; } doc.text(l, 16, y); y += size * 0.55; }); y += 3; };
    line(data?.title ?? 'Class notes', 16, true);
    if (data?.aiSummary) { line('Summary', 13, true); line(data.aiSummary); }
    if (data?.keyPoints?.length) { line('Key concepts', 13, true); data.keyPoints.forEach((k) => line('• ' + k)); }
    if (data?.unansweredQuestions?.length) { line('Open questions', 13, true); data.unansweredQuestions.forEach((k) => line('• ' + k)); }
    if (notes) { line('My notes', 13, true); line(notes); }
    doc.save(`learnova-notes-${id}.pdf`);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-ink">{data?.title ?? 'Class replay'}</h1>
        {data?.recording?.url
          ? <video ref={videoRef} src={data.recording.url} controls className="aspect-video w-full rounded-2xl bg-black" />
          : <div className="grid aspect-video w-full place-items-center rounded-2xl bg-gray-900 text-white/70">Recording will appear here once processed</div>}

        {/* Transcript search */}
        <Card>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search within the class transcript…"
              className="w-full rounded-xl border border-gray-300 py-2.5 pl-10 pr-3 outline-none focus:border-brand" />
          </div>
          {q && (
            <div className="mt-3 space-y-1 text-sm">
              {transcriptHits.map(({ s, i, atMs }) => (
                <div key={i} className="flex items-start justify-between gap-2">
                  <p className="text-ink-soft">…{s}…</p>
                  {atMs > 0 && <button onClick={() => jump(atMs)} className="shrink-0 rounded-lg bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand">Jump {fmt(atMs)}</button>}
                </div>
              ))}
              {!transcriptHits.length && <p className="text-ink-soft">No matches{data?.transcript?.text ? '' : ' (transcript available after processing)'}.</p>}
            </div>
          )}
        </Card>

        {/* Personal notes */}
        <Card>
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-ink"><StickyNote className="h-4 w-4 text-gold-dark" /> My notes</p>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => save()} rows={4}
            placeholder="Jot down your own notes — saved automatically." className="mt-2 w-full rounded-xl border border-gray-300 p-3 text-sm outline-none focus:border-brand" />
        </Card>
      </div>

      {/* Sidebar */}
      <div className="space-y-3">
        <Card>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-ink">Chapters</p>
            <button onClick={downloadPdf} className="inline-flex items-center gap-1 text-xs font-medium text-brand"><FileDown className="h-3.5 w-3.5" /> PDF notes</button>
          </div>
          <div className="mt-2 space-y-1">
            {data?.chapters?.map((c, i) => (
              <button key={i} onClick={() => jump(c.atMs)} className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm hover:bg-brand-soft">
                <span className="inline-flex items-center gap-1"><Play className="h-3 w-3 text-brand" /> {c.title}</span><span className="text-ink-soft">{fmt(c.atMs)}</span>
              </button>
            ))}
            {!data?.chapters?.length && <p className="text-sm text-ink-soft">Chapters appear after the class is processed.</p>}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-ink">Timestamped notes</p>
            <button onClick={addBookmark} className="inline-flex items-center gap-1 text-xs font-medium text-brand"><Bookmark className="h-3.5 w-3.5" /> Add here</button>
          </div>
          <div className="mt-2 space-y-1">
            {bookmarks.map((b, i) => (
              <button key={i} onClick={() => jump(b.atMs)} className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm hover:bg-brand-soft">
                <span>{b.label}</span><span className="text-ink-soft">{fmt(b.atMs)}</span>
              </button>
            ))}
            {!bookmarks.length && <p className="text-sm text-ink-soft">Tap “Add here” to bookmark the current moment.</p>}
          </div>
        </Card>

        {data?.aiSummary && <Card><p className="text-sm font-semibold text-ink">Summary</p><p className="mt-1 text-sm text-ink-soft">{data.aiSummary}</p></Card>}
      </div>
    </div>
  );
}
