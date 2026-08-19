'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Users, BookOpen, FlaskConical, MessagesSquare, Plus, Send } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';
import { useMe } from '@/features/profile/useMe';

interface Group { _id: string; name: string; kind: string; description?: string; memberIds?: string[] }
interface Post { _id: string; body: string; authorId?: string; createdAt?: string }
const KINDS = [
  { id: 'club', label: 'Clubs', icon: Users },
  { id: 'study_group', label: 'Study groups', icon: BookOpen },
  { id: 'research', label: 'Research', icon: FlaskConical },
  { id: 'forum', label: 'Forums', icon: MessagesSquare },
];

export default function Community() {
  const token = useAuth((s) => s.accessToken) ?? undefined;
  const qc = useQueryClient();
  const [kind, setKind] = useState('');
  const [open, setOpen] = useState<Group | null>(null);
  const [showNew, setShowNew] = useState(false);
  const { data: groups } = useQuery({ queryKey: ['groups'], queryFn: () => api.get<Group[]>('/community/groups', token), enabled: !!token });
  const list = (groups ?? []).filter((g) => !kind || g.kind === kind);
  const { data: me } = useMe();
  const canForm = me?.role === 'teacher' || me?.role === 'school_admin' || me?.role === 'super_admin';
  const autoForm = async () => {
    try { const r = await api.post<{ totalGroups: number }>('/community/auto-form-groups', {}, token); qc.invalidateQueries({ queryKey: ['groups'] }); alert(`AI formed ${r.totalGroups} study group(s) by shared weak subjects.`); }
    catch (e) { alert((e as Error).message); }
  };
  const findMyGroup = async () => {
    try { const r = await api.get<{ concepts: string[]; groups: { name: string }[] }>('/community/my-study-matches', token);
      if (!r.concepts.length) { alert('No weak topics detected yet — take a quiz so we can match you.'); return; }
      alert(r.groups.length ? `You match these study groups: ${r.groups.map((g) => g.name).join(', ')}` : `Your weak topics: ${r.concepts.join(', ')}. Ask a teacher to auto-form groups.`); }
    catch (e) { alert((e as Error).message); }
  };

  if (open) return <GroupView group={open} token={token} onBack={() => setOpen(null)} />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-ink">Community</h1><p className="text-sm text-ink-soft">Clubs, study groups, research teams & discussion forums.</p></div>
        <div className="flex gap-2">
          {canForm && <button onClick={autoForm} className="inline-flex items-center gap-1 rounded-xl border border-violet-300 px-3 py-2 text-sm font-medium text-violet-700 hover:bg-violet-50">✨ Auto-form study groups</button>}
          {me?.role === 'student' && <button onClick={findMyGroup} className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium hover:border-brand">Find my study group</button>}
          <button onClick={() => setShowNew((v) => !v)} className="inline-flex items-center gap-1 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" /> New</button>
        </div>
      </div>

      {showNew && <NewGroup token={token} onDone={() => { setShowNew(false); qc.invalidateQueries({ queryKey: ['groups'] }); }} />}

      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => setKind('')} className={`rounded-xl px-3 py-1.5 text-sm font-medium ${kind === '' ? 'bg-brand text-white' : 'border border-gray-200'}`}>All</button>
        {KINDS.map((k) => <button key={k.id} onClick={() => setKind(k.id)} className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium ${kind === k.id ? 'bg-brand text-white' : 'border border-gray-200 hover:border-brand'}`}><k.icon className="h-4 w-4" /> {k.label}</button>)}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((g) => {
          const Icon = KINDS.find((k) => k.id === g.kind)?.icon ?? MessagesSquare;
          return (
            <Card key={g._id} className="cursor-pointer hover:border-brand" >
              <button onClick={() => setOpen(g)} className="w-full text-left">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-brand"><Icon className="h-5 w-5" /></span>
                <h3 className="mt-2 font-bold text-ink">{g.name}</h3>
                <p className="text-xs uppercase tracking-wide text-gray-400">{g.kind.replace('_', ' ')}</p>
                {g.description && <p className="mt-1 text-sm text-ink-soft">{g.description}</p>}
                <p className="mt-2 text-xs text-ink-soft">{g.memberIds?.length ?? 0} members</p>
              </button>
            </Card>
          );
        })}
        {!list.length && <p className="text-ink-soft">No groups here yet — create the first one.</p>}
      </div>
    </div>
  );
}

function NewGroup({ token, onDone }: { token?: string; onDone: () => void }) {
  const [f, setF] = useState({ name: '', kind: 'club', description: '' });
  const submit = async () => { await api.post('/community/groups', f, token); onDone(); };
  return (
    <Card className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">{KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}</select>
        <input placeholder="Group name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        <input placeholder="Description" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        <button onClick={submit} disabled={f.name.length < 2} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">Create</button>
      </div>
    </Card>
  );
}

function GroupView({ group, token, onBack }: { group: Group; token?: string; onBack: () => void }) {
  const qc = useQueryClient();
  const [body, setBody] = useState('');
  const { data: posts } = useQuery({ queryKey: ['posts', group._id], queryFn: () => api.get<Post[]>(`/community/groups/${group._id}/posts`, token), enabled: !!token });
  const send = async () => { if (!body.trim()) return; await api.post(`/community/groups/${group._id}/posts`, { body }, token); setBody(''); qc.invalidateQueries({ queryKey: ['posts', group._id] }); };
  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm text-brand">← Back to community</button>
      <h1 className="text-2xl font-bold text-ink">{group.name}</h1>
      <Card className="space-y-3">
        {posts?.map((p) => <div key={p._id} className="border-b border-gray-100 pb-2 text-sm last:border-0"><p className="text-ink">{p.body}</p>{p.createdAt && <p className="text-xs text-ink-soft">{new Date(p.createdAt).toLocaleString()}</p>}</div>)}
        {!posts?.length && <p className="text-sm text-ink-soft">No posts yet. Start the discussion.</p>}
        <div className="flex gap-2">
          <input value={body} onChange={(e) => setBody(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') send(); }} placeholder="Write a post…" className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand" />
          <button onClick={send} className="rounded-lg bg-brand px-3 text-white"><Send className="h-4 w-4" /></button>
        </div>
      </Card>
    </div>
  );
}
