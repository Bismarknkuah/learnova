'use client';
import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';
import { Search, Send, MessageSquare, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';
import { useMe } from '@/features/profile/useMe';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
interface Convo { _id: string; lastMessage?: string; lastAt?: string; other?: { _id: string; name?: string; role?: string } }
interface Msg { _id: string; fromId: string; body: string; createdAt?: string }
interface Contact { _id: string; name?: string; role?: string }

export default function Messages() {
  const token = useAuth((s) => s.accessToken) ?? undefined;
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [active, setActive] = useState<Convo | null>(null);
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const { data: convos } = useQuery({ queryKey: ['convos'], queryFn: () => api.get<Convo[]>('/messages/conversations', token), enabled: !!token, refetchInterval: 15000 });
  const { data: contacts } = useQuery({ queryKey: ['contacts', search], queryFn: () => api.get<Contact[]>(`/messages/contacts?q=${encodeURIComponent(search)}`, token), enabled: !!token && search.length > 0 });
  const { data: messages } = useQuery({ queryKey: ['msgs', active?._id], queryFn: () => api.get<Msg[]>(`/messages/conversations/${active!._id}/messages`, token), enabled: !!active });

  // Real-time: identify to our user room and refresh on incoming DMs.
  useEffect(() => {
    if (!me?._id) return;
    const s = io(API, { transports: ['websocket', 'polling'] });
    s.on('connect', () => s.emit('identify', { userId: me._id }));
    s.on('dm:new', () => { qc.invalidateQueries({ queryKey: ['convos'] }); qc.invalidateQueries({ queryKey: ['msgs'] }); });
    socketRef.current = s;
    return () => { s.disconnect(); };
  }, [me?._id, qc]);

  useEffect(() => { bottomRef.current?.scrollIntoView(); }, [messages]);

  const openContact = async (c: Contact) => {
    const convo = await api.post<{ _id: string }>('/messages/conversations', { userId: c._id }, token);
    setActive({ _id: convo._id, other: c }); setSearch('');
    qc.invalidateQueries({ queryKey: ['convos'] });
  };
  const send = async () => {
    if (!text.trim() || !active) return;
    const body = text; setText('');
    await api.post(`/messages/conversations/${active._id}/messages`, { body }, token);
    qc.invalidateQueries({ queryKey: ['msgs', active._id] }); qc.invalidateQueries({ queryKey: ['convos'] });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      {/* List */}
      <div className={`${active ? 'hidden lg:block' : ''} rounded-2xl border border-gray-200 bg-white`}>
        <div className="border-b border-gray-100 p-3">
          <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2">
            <Search className="h-4 w-4 text-ink-soft" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search people…" className="w-full bg-transparent text-sm outline-none" />
          </div>
        </div>
        <div className="max-h-[70vh] overflow-y-auto">
          {search && contacts?.map((c) => (
            <button key={c._id} onClick={() => openContact(c)} className="flex w-full items-center gap-3 border-b border-gray-50 p-3 text-left hover:bg-brand-soft">
              <Avatar name={c.name} /><div><p className="text-sm font-medium text-ink">{c.name}</p><p className="text-xs capitalize text-ink-soft">{c.role}</p></div>
            </button>
          ))}
          {!search && convos?.map((c) => (
            <button key={c._id} onClick={() => setActive(c)} className={`flex w-full items-center gap-3 border-b border-gray-50 p-3 text-left hover:bg-brand-soft ${active?._id === c._id ? 'bg-brand-soft' : ''}`}>
              <Avatar name={c.other?.name} />
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-ink">{c.other?.name}</p><p className="truncate text-xs text-ink-soft">{c.lastMessage ?? 'Say hello 👋'}</p></div>
            </button>
          ))}
          {!search && !convos?.length && <p className="p-4 text-sm text-ink-soft">No conversations yet. Search for someone to start.</p>}
        </div>
      </div>

      {/* Thread */}
      <div className={`${active ? '' : 'hidden lg:flex'} flex h-[75vh] flex-col rounded-2xl border border-gray-200 bg-white`}>
        {active ? (
          <>
            <div className="flex items-center gap-2 border-b border-gray-100 p-3">
              <button onClick={() => setActive(null)} className="lg:hidden"><ArrowLeft className="h-5 w-5 text-ink-soft" /></button>
              <Avatar name={active.other?.name} /><p className="font-semibold text-ink">{active.other?.name}</p>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {messages?.map((m) => {
                const mine = m.fromId === me?._id;
                return <div key={m._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}><span className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${mine ? 'bg-brand text-white' : 'bg-gray-100 text-ink'}`}>{m.body}</span></div>;
              })}
              <div ref={bottomRef} />
            </div>
            <div className="flex gap-2 border-t border-gray-100 p-3">
              <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') send(); }} placeholder="Type a message…" className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand" />
              <button onClick={send} disabled={!text.trim()} className="rounded-xl bg-brand px-4 text-white"><Send className="h-5 w-5" /></button>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-ink-soft"><MessageSquare className="h-10 w-10 opacity-30" /><p className="mt-2 text-sm">Select a conversation</p></div>
        )}
      </div>
    </div>
  );
}

function Avatar({ name }: { name?: string }) {
  return <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-soft font-bold text-brand">{name?.[0] ?? '?'}</span>;
}
