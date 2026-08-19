'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart, MessageCircle, Send, FlaskConical, HelpCircle, Award, PenLine } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';

interface Post { _id: string; kind: string; body: string; link?: string; imageUrl?: string; tags?: string[]; author?: { name?: string; role?: string }; likes: number; commentCount: number; likedByMe: boolean; createdAt?: string }
interface Comment { _id: string; body: string; authorId?: { name?: string }; createdAt?: string }
const KIND_ICON: Record<string, typeof PenLine> = { post: PenLine, research: FlaskConical, question: HelpCircle, achievement: Award };

export default function Feed() {
  const token = useAuth((s) => s.accessToken) ?? undefined;
  const qc = useQueryClient();
  const { data: posts } = useQuery({ queryKey: ['feed'], queryFn: () => api.get<Post[]>('/feed', token), enabled: !!token });
  const [body, setBody] = useState('');
  const [kind, setKind] = useState('post');
  const [link, setLink] = useState('');
  const [image, setImage] = useState('');
  const [openComments, setOpenComments] = useState<string | null>(null);

  const post = async () => {
    if (!body.trim()) return;
    await api.post('/feed', { body, kind, link: link || undefined, imageUrl: image || undefined }, token);
    setBody(''); setLink(''); setImage(''); qc.invalidateQueries({ queryKey: ['feed'] });
  };
  const like = async (id: string) => { await api.post(`/feed/${id}/like`, {}, token); qc.invalidateQueries({ queryKey: ['feed'] }); };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold text-ink">Campus feed</h1>

      <Card className="space-y-2">
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} placeholder="Share something academic…" className="w-full rounded-xl border border-gray-300 p-3 text-sm outline-none focus:border-brand" />
        <div className="flex flex-wrap items-center gap-2">
          <select value={kind} onChange={(e) => setKind(e.target.value)} className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm">
            <option value="post">Post</option><option value="research">Research</option><option value="question">Question</option><option value="achievement">Achievement</option>
          </select>
          {image && <img src={image} alt="attach" className="h-16 rounded-lg object-cover" />}
          {kind === 'research' && <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Paper link (optional)" className="flex-1 rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />}
          <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-ink-soft hover:border-brand">📷 Photo
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; if (f.size > 600000) { alert('Image must be under 600KB'); return; } const r = new FileReader(); r.onload = () => setImage(String(r.result)); r.readAsDataURL(f); }} />
          </label>
          <button onClick={post} disabled={!body.trim()} className="ml-auto rounded-lg bg-brand px-4 py-1.5 text-sm font-semibold text-white">Post</button>
        </div>
      </Card>

      {posts?.map((p) => {
        const Icon = KIND_ICON[p.kind] ?? PenLine;
        return (
          <Card key={p._id}>
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-soft font-bold text-brand">{p.author?.name?.[0] ?? '?'}</span>
              <div><p className="text-sm font-semibold text-ink">{p.author?.name ?? 'Student'} <span className="text-xs font-normal text-ink-soft">· {p.author?.role}</span></p>
                {p.createdAt && <p className="text-xs text-ink-soft">{new Date(p.createdAt).toLocaleString()}</p>}</div>
              {p.kind !== 'post' && <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs capitalize text-ink-soft"><Icon className="h-3 w-3" /> {p.kind}</span>}
            </div>
            <p className="mt-2 text-sm text-ink">{p.body}</p>
            {p.imageUrl && <img src={p.imageUrl} alt="" className="mt-2 max-h-80 w-full rounded-xl object-cover" />}
            {p.link && <a href={p.link} target="_blank" className="mt-1 block text-sm text-brand underline">{p.link}</a>}
            <div className="mt-3 flex gap-4 text-sm">
              <button onClick={() => like(p._id)} className={`inline-flex items-center gap-1 ${p.likedByMe ? 'text-coral' : 'text-ink-soft'}`}><Heart className={`h-4 w-4 ${p.likedByMe ? 'fill-coral' : ''}`} /> {p.likes}</button>
              <button onClick={() => setOpenComments(openComments === p._id ? null : p._id)} className="inline-flex items-center gap-1 text-ink-soft"><MessageCircle className="h-4 w-4" /> {p.commentCount}</button>
            </div>
            {openComments === p._id && <Comments postId={p._id} token={token} onAdd={() => qc.invalidateQueries({ queryKey: ['feed'] })} />}
          </Card>
        );
      })}
      {!posts?.length && <p className="text-ink-soft">No posts yet — share the first one!</p>}
    </div>
  );
}

function Comments({ postId, token, onAdd }: { postId: string; token?: string; onAdd: () => void }) {
  const qc = useQueryClient();
  const [body, setBody] = useState('');
  const { data } = useQuery({ queryKey: ['comments', postId], queryFn: () => api.get<Comment[]>(`/feed/${postId}/comments`, token), enabled: !!token });
  const add = async () => { if (!body.trim()) return; await api.post(`/feed/${postId}/comments`, { body }, token); setBody(''); qc.invalidateQueries({ queryKey: ['comments', postId] }); onAdd(); };
  return (
    <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
      {data?.map((c) => <p key={c._id} className="text-sm"><span className="font-medium text-brand">{c.authorId?.name ?? 'User'}:</span> {c.body}</p>)}
      <div className="flex gap-2">
        <input value={body} onChange={(e) => setBody(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(); }} placeholder="Add a comment…" className="flex-1 rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-brand" />
        <button onClick={add} className="rounded-lg bg-brand px-3 text-white"><Send className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
