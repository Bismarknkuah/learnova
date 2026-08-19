'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMe } from '@/features/profile/useMe';
import { Plus } from 'lucide-react';
import { BookOpen, Newspaper, FileText, Video, Search, ExternalLink, Download } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';

interface Resource { _id: string; type: string; title: string; subject?: string; author?: string; url?: string }
const CATS = [
  { id: 'ebook', label: 'E-books', icon: BookOpen },
  { id: 'journal', label: 'Journals', icon: Newspaper },
  { id: 'notes', label: 'Lecture notes', icon: FileText },
  { id: 'recording', label: 'Recorded sessions', icon: Video },
];

export default function LibraryPage() {
  const token = useAuth((s) => s.accessToken) ?? undefined;
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const { data } = useQuery({ queryKey: ['library', q], queryFn: () => api.get<Resource[]>(`/library${q ? `?q=${encodeURIComponent(q)}` : ''}`, token), enabled: !!token });
  const { data: me } = useMe();
  const canAdd = me?.role === 'teacher' || me?.role === 'school_admin' || me?.role === 'super_admin';
  const list = (data ?? []).filter((r) => !type || r.type === type);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink">Digital library</h1>
        <p className="text-sm text-ink-soft">E-books, journals, lecture notes and recorded sessions.</p>
      </div>
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search titles…" className="w-full rounded-xl border border-gray-300 py-2.5 pl-10 pr-3 outline-none focus:border-brand" />
      </div>
      {canAdd && <AddResource token={token} />}
      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => setType('')} className={`rounded-xl px-3 py-1.5 text-sm font-medium ${type === '' ? 'bg-brand text-white' : 'border border-gray-200'}`}>All</button>
        {CATS.map((c) => <button key={c.id} onClick={() => setType(c.id)} className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium ${type === c.id ? 'bg-brand text-white' : 'border border-gray-200 hover:border-brand'}`}><c.icon className="h-4 w-4" /> {c.label}</button>)}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((r) => {
          const Icon = CATS.find((c) => c.id === r.type)?.icon ?? FileText;
          return (
            <Card key={r._id} className="flex flex-col">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-brand"><Icon className="h-5 w-5" /></span>
              <h3 className="mt-2 font-bold text-ink">{r.title}</h3>
              <p className="text-xs uppercase tracking-wide text-gray-400">{r.type}{r.subject ? ` · ${r.subject}` : ''}</p>
              {r.author && <p className="text-sm text-ink-soft">{r.author}</p>}
              {r.url && (
                <div className="mt-3 flex gap-2">
                  <a href={r.url} target="_blank" className="inline-flex items-center gap-1 rounded-lg bg-ink px-3 py-1.5 text-sm font-semibold text-white"><ExternalLink className="h-3.5 w-3.5" /> Open</a>
                  <a href={r.url} download className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium hover:border-brand"><Download className="h-3.5 w-3.5" /> Save offline</a>
                </div>
              )}
            </Card>
          );
        })}
        {!list.length && <p className="text-ink-soft">No resources in this category yet.</p>}
      </div>
    </div>
  );
}

function AddResource({ token }: { token?: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ type: 'ebook', title: '', subject: '', author: '', url: '' });
  const submit = async () => {
    try { await api.post('/library', { ...f, url: f.url || undefined }, token); setF({ type: 'ebook', title: '', subject: '', author: '', url: '' }); setOpen(false); qc.invalidateQueries({ queryKey: ['library'] }); }
    catch (e) { alert((e as Error).message); }
  };
  if (!open) return <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1 rounded-xl border border-brand/30 px-3 py-2 text-sm font-medium text-brand hover:bg-brand-soft"><Plus className="h-4 w-4" /> Upload e-book / journal</button>;
  return (
    <Card className="space-y-2">
      <p className="font-semibold text-ink">Add a resource</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm"><option value="ebook">E-book</option><option value="journal">Journal</option><option value="notes">Lecture notes</option><option value="recording">Recorded session</option></select>
        <input placeholder="Title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        <input placeholder="Subject" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        <input placeholder="Author" value={f.author} onChange={(e) => setF({ ...f, author: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        <input placeholder="Link to file (PDF/URL)" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm sm:col-span-2" />
      </div>
      <div className="flex gap-2"><button onClick={submit} disabled={f.title.length < 2} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">Publish</button><button onClick={() => setOpen(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm">Cancel</button></div>
      <p className="text-xs text-ink-soft">Host the file (Google Drive, Dropbox, your site) and paste the share link.</p>
    </Card>
  );
}
