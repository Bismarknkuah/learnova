'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, FileText, GraduationCap, ClipboardList, FileCode2, Files, Plus, ShoppingCart } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';
import { useMe } from '@/features/profile/useMe';

interface Product { _id: string; type: string; title: string; subject?: string; priceGHS: number; salesCount?: number; rating?: number }
const KINDS = [
  { id: 'course', label: 'Courses', icon: GraduationCap },
  { id: 'ebook', label: 'E-books', icon: BookOpen },
  { id: 'notes', label: 'Notes', icon: FileText },
  { id: 'past_questions', label: 'Past Qs', icon: ClipboardList },
  { id: 'guide', label: 'Guides', icon: Files },
  { id: 'template', label: 'Templates', icon: FileCode2 },
];

export default function Marketplace() {
  const token = useAuth((s) => s.accessToken) ?? undefined;
  const qc = useQueryClient();
  const { data: me } = useMe();
  const [kind, setKind] = useState<string>('');
  const [showSell, setShowSell] = useState(false);
  const canSell = me?.role === 'teacher' || me?.role === 'school_admin';

  const { data: products } = useQuery({
    queryKey: ['products', kind],
    queryFn: () => api.get<Product[]>(`/marketplace${kind ? `?type=${kind}` : ''}`, token),
    enabled: !!token,
  });

  const buy = async (id: string) => {
    try { await api.post(`/marketplace/${id}/purchase`, {}, token); qc.invalidateQueries({ queryKey: ['products'] }); alert('Purchased! Find it in your library.'); }
    catch (e) { alert((e as Error).message); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-ink">Marketplace</h1><p className="text-sm text-ink-soft">Courses, e-books, notes, past questions, guides & templates from teachers.</p></div>
        {canSell && <button onClick={() => setShowSell((v) => !v)} className="inline-flex items-center gap-1 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" /> Sell</button>}
      </div>

      {showSell && canSell && <SellForm onDone={() => { setShowSell(false); qc.invalidateQueries({ queryKey: ['products'] }); }} token={token} />}

      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => setKind('')} className={`rounded-xl px-3 py-1.5 text-sm font-medium ${kind === '' ? 'bg-brand text-white' : 'border border-gray-200'}`}>All</button>
        {KINDS.map((k) => (
          <button key={k.id} onClick={() => setKind(k.id)} className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium ${kind === k.id ? 'bg-brand text-white' : 'border border-gray-200 hover:border-brand'}`}>
            <k.icon className="h-4 w-4" /> {k.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products?.map((p) => {
          const Icon = KINDS.find((k) => k.id === p.type)?.icon ?? FileText;
          return (
            <Card key={p._id} className="flex flex-col">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-brand"><Icon className="h-5 w-5" /></span>
              <h3 className="mt-2 font-bold text-ink">{p.title}</h3>
              <p className="text-xs uppercase tracking-wide text-gray-400">{p.type.replace('_', ' ')}{p.subject ? ` · ${p.subject}` : ''}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-lg font-bold text-brand">{p.priceGHS === 0 ? 'Free' : `₵${p.priceGHS}`}</span>
                <button onClick={() => buy(p._id)} className="inline-flex items-center gap-1 rounded-lg bg-ink px-3 py-1.5 text-sm font-semibold text-white"><ShoppingCart className="h-3.5 w-3.5" /> Get</button>
              </div>
              {(p.salesCount ?? 0) > 0 && <p className="mt-1 text-xs text-ink-soft">{p.salesCount} sold</p>}
            </Card>
          );
        })}
        {!products?.length && <p className="text-ink-soft">No products here yet.</p>}
      </div>
    </div>
  );
}

function SellForm({ onDone, token }: { onDone: () => void; token?: string }) {
  const [f, setF] = useState({ type: 'notes', title: '', subject: '', priceGHS: '' });
  const submit = async () => {
    await api.post('/marketplace', { type: f.type, title: f.title, subject: f.subject || undefined, priceGHS: Number(f.priceGHS || 0), isPublished: true }, token);
    onDone();
  };
  return (
    <Card className="space-y-2">
      <h3 className="font-semibold text-ink">List a product</h3>
      <div className="flex flex-wrap gap-2">
        <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          {KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
        </select>
        <input placeholder="Title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        <input placeholder="Subject" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        <input type="number" placeholder="₵ Price" value={f.priceGHS} onChange={(e) => setF({ ...f, priceGHS: e.target.value })} className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        <button onClick={submit} disabled={f.title.length < 2} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">Publish</button>
      </div>
    </Card>
  );
}
