'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Award, GraduationCap, FolderGit2, Sparkles, FileText, Trophy, Copy, Download } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';

interface Portfolio {
  profile: { name?: string; educationLevel?: string; subjects: string[] };
  skills: string[];
  certificates: { title: string; verifyCode: string; issuedAt?: string }[];
  results: { courseTitle: string; score: number; grade: string }[];
  projects: { title: string; type: string; subject?: string; salesCount?: number }[];
  achievements: string[];
  stats: { xp: number; level: number; certificates: number; projects: number };
}

export default function PortfolioPage() {
  const token = useAuth((s) => s.accessToken) ?? undefined;
  const { data: p } = useQuery({ queryKey: ['portfolio'], queryFn: () => api.get<Portfolio>('/portfolio', token), enabled: !!token });
  const [doc, setDoc] = useState<{ kind: string; text: string } | null>(null);
  const [edited, setEdited] = useState('');
  const [cvType, setCvType] = useState('Chronological');
  const [target, setTarget] = useState('');
  const [busy, setBusy] = useState('');

  const generate = async (kind: 'cv' | 'statement' | 'cover_letter') => {
    if (!p) return;
    setBusy(kind);
    try {
      const r = await api.post<{ kind: string; text: string }>('/ai/cv', {
        kind, name: p.profile.name, skills: p.skills, target: kind === 'cv' ? `${cvType} CV` : target || undefined,
        highlights: [...p.achievements, ...p.certificates.map((c) => c.title)].slice(0, 10),
      }, token);
      setDoc(r); setEdited(r.text);
    } catch (e) { alert((e as Error).message); } finally { setBusy(''); }
  };
  const download = () => {
    if (!doc) return;
    const url = URL.createObjectURL(new Blob([edited], { type: 'text/plain' }));
    const a = document.createElement('a'); a.href = url; a.download = `${doc.kind}.txt`; a.click(); URL.revokeObjectURL(url);
  };

  if (!p) return <p className="text-ink-soft">Building your portfolio…</p>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-ink">{p.profile.name}’s portfolio</h1><p className="text-sm text-ink-soft">{p.profile.educationLevel} · auto-built from your achievements</p></div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {[['XP', p.stats.xp], ['Level', p.stats.level], ['Certificates', p.stats.certificates], ['Projects', p.stats.projects]].map(([l, v]) => (
          <Card key={l} className="text-center"><p className="text-sm text-ink-soft">{l}</p><p className="mt-1 text-2xl font-bold text-ink">{v}</p></Card>
        ))}
      </div>

      {/* AI document generation */}
      <Card>
        <p className="inline-flex items-center gap-2 font-semibold text-ink"><Sparkles className="h-5 w-5 text-violet-600" /> AI CV & application writer</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <label className="text-sm text-ink-soft">CV type
            <select value={cvType} onChange={(e) => setCvType(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="Chronological">Chronological</option>
              <option value="Skills-based">Skills-based (functional)</option>
              <option value="Academic">Academic / research</option>
              <option value="Combination">Combination</option>
            </select>
          </label>
          <label className="text-sm text-ink-soft">Target role / programme (optional)
            <input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="e.g. Medicine at KNUST" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </label>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <button onClick={() => generate('cv')} disabled={!!busy} className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white">{busy === 'cv' ? '…' : 'Generate CV'}</button>
          <button onClick={() => generate('statement')} disabled={!!busy} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium hover:border-brand">{busy === 'statement' ? '…' : 'Personal statement'}</button>
          <button onClick={() => generate('cover_letter')} disabled={!!busy} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium hover:border-brand">{busy === 'cover_letter' ? '…' : 'Cover letter'}</button>
        </div>
        {doc && (
          <div className="mt-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs text-ink-soft">✏️ Edit your {doc.kind.replace('_', ' ')} below, then download.</p>
              <div className="flex gap-2">
                <button onClick={() => navigator.clipboard.writeText(edited)} className="inline-flex items-center gap-1 text-sm text-brand"><Copy className="h-3.5 w-3.5" /> Copy</button>
                <button onClick={download} className="inline-flex items-center gap-1 text-sm text-brand"><Download className="h-3.5 w-3.5" /> Download</button>
              </div>
            </div>
            <textarea value={edited} onChange={(e) => setEdited(e.target.value)} rows={16} className="w-full rounded-xl border border-gray-200 bg-gray-50 p-4 font-mono text-sm text-ink outline-none focus:border-brand" />
          </div>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <p className="inline-flex items-center gap-2 font-semibold text-ink"><Award className="h-5 w-5 text-gold-dark" /> Certificates</p>
          <div className="mt-2 space-y-1.5">
            {p.certificates.map((c, i) => <a key={i} href={`/verify/${c.verifyCode}`} target="_blank" className="block border-b border-gray-100 py-1.5 text-sm last:border-0 hover:text-brand">{c.title}</a>)}
            {!p.certificates.length && <p className="text-sm text-ink-soft">No certificates yet.</p>}
          </div>
        </Card>
        <Card>
          <p className="inline-flex items-center gap-2 font-semibold text-ink"><GraduationCap className="h-5 w-5 text-brand" /> Academic results</p>
          <div className="mt-2 space-y-1.5">
            {p.results.map((r, i) => <div key={i} className="flex justify-between border-b border-gray-100 py-1.5 text-sm last:border-0"><span>{r.courseTitle}</span><span className="font-semibold">{r.score} · {r.grade}</span></div>)}
            {!p.results.length && <p className="text-sm text-ink-soft">No results yet.</p>}
          </div>
        </Card>
        <Card>
          <p className="inline-flex items-center gap-2 font-semibold text-ink"><FolderGit2 className="h-5 w-5 text-sky-600" /> Projects</p>
          <div className="mt-2 space-y-1.5">
            {p.projects.map((pr, i) => <div key={i} className="border-b border-gray-100 py-1.5 text-sm last:border-0">{pr.title} <span className="text-ink-soft">· {pr.type}</span></div>)}
            {!p.projects.length && <p className="text-sm text-ink-soft">Publish work in the marketplace to show projects here.</p>}
          </div>
        </Card>
        <Card>
          <p className="inline-flex items-center gap-2 font-semibold text-ink"><Trophy className="h-5 w-5 text-coral" /> Achievements & skills</p>
          <div className="mt-2 flex flex-wrap gap-1.5">{p.skills.map((s) => <span key={s} className="rounded-lg bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand">{s}</span>)}</div>
          <ul className="mt-2 ml-5 list-disc text-sm text-ink-soft">{p.achievements.map((a, i) => <li key={i}>{a}</li>)}</ul>
        </Card>
      </div>
    </div>
  );
}
