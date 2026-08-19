'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FlaskConical, Plus, FileText, Presentation, Send, Users } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';

interface Team { _id: string; name: string; description?: string; memberIds?: string[] }
interface Post { _id: string; body: string; createdAt?: string }

export default function ResearchHub() {
  const token = useAuth((s) => s.accessToken) ?? undefined;
  const qc = useQueryClient();
  const [open, setOpen] = useState<Team | null>(null);
  const [showNew, setShowNew] = useState(false);
  const { data: groups } = useQuery({ queryKey: ['research-teams'], queryFn: () => api.get<(Team & { kind: string })[]>('/community/groups', token), enabled: !!token });
  const teams = (groups ?? []).filter((g) => g.kind === 'research');

  if (open) return <TeamView team={open} token={token} onBack={() => setOpen(null)} />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="inline-flex items-center gap-2 text-2xl font-bold text-ink"><FlaskConical className="h-6 w-6 text-violet-600" /> Research Hub</h1>
          <p className="text-sm text-ink-soft">Form teams, share papers, run seminars and manage projects.</p>
        </div>
        <button onClick={() => setShowNew((v) => !v)} className="inline-flex items-center gap-1 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" /> New team</button>
      </div>

      {showNew && <NewTeam token={token} onDone={() => { setShowNew(false); qc.invalidateQueries({ queryKey: ['research-teams'] }); }} />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {teams.map((t) => (
          <Card key={t._id} className="cursor-pointer hover:border-brand">
            <button onClick={() => setOpen(t)} className="w-full text-left">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-100 text-violet-700"><FlaskConical className="h-5 w-5" /></span>
              <h3 className="mt-2 font-bold text-ink">{t.name}</h3>
              {t.description && <p className="text-sm text-ink-soft">{t.description}</p>}
              <p className="mt-2 inline-flex items-center gap-1 text-xs text-ink-soft"><Users className="h-3.5 w-3.5" /> {t.memberIds?.length ?? 0} researchers</p>
            </button>
          </Card>
        ))}
        {!teams.length && <p className="text-ink-soft">No research teams yet — form the first one.</p>}
      </div>
    </div>
  );
}

function NewTeam({ token, onDone }: { token?: string; onDone: () => void }) {
  const [f, setF] = useState({ name: '', description: '' });
  const submit = async () => { await api.post('/community/groups', { ...f, kind: 'research' }, token); onDone(); };
  return (
    <Card className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <input placeholder="Team / lab name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        <input placeholder="Research focus" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        <button onClick={submit} disabled={f.name.length < 2} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">Create</button>
      </div>
    </Card>
  );
}

function TeamView({ team, token, onBack }: { team: Team; token?: string; onBack: () => void }) {
  const qc = useQueryClient();
  const [body, setBody] = useState('');
  const { data: posts } = useQuery({ queryKey: ['research-posts', team._id], queryFn: () => api.get<Post[]>(`/community/groups/${team._id}/posts`, token), enabled: !!token });
  const share = async (prefix = '') => { const text = prefix + body; if (!text.trim()) return; await api.post(`/community/groups/${team._id}/posts`, { body: text }, token); setBody(''); qc.invalidateQueries({ queryKey: ['research-posts', team._id] }); };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm text-brand">← Back to research hub</button>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">{team.name}</h1>
        <a href="/classroom/new" className="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium hover:border-brand"><Presentation className="h-4 w-4" /> Start seminar</a>
      </div>
      <Card className="space-y-3">
        <p className="inline-flex items-center gap-2 font-semibold text-ink"><FileText className="h-5 w-5 text-brand" /> Papers, projects & updates</p>
        {posts?.map((p) => <div key={p._id} className="border-b border-gray-100 pb-2 text-sm last:border-0"><p className="text-ink">{p.body}</p>{p.createdAt && <p className="text-xs text-ink-soft">{new Date(p.createdAt).toLocaleString()}</p>}</div>)}
        {!posts?.length && <p className="text-sm text-ink-soft">No shared papers or project notes yet.</p>}
        <div className="flex gap-2">
          <input value={body} onChange={(e) => setBody(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') share(); }} placeholder="Share a paper link, project update or finding…" className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand" />
          <button onClick={() => share('📄 Paper: ')} className="rounded-lg border border-gray-200 px-3 text-sm hover:border-brand">Paper</button>
          <button onClick={() => share()} className="rounded-lg bg-brand px-3 text-white"><Send className="h-4 w-4" /></button>
        </div>
      </Card>
    </div>
  );
}
