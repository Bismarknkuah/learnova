'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Sparkles, Crown } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';
import { useMe } from '@/features/profile/useMe';
import Link from 'next/link';

interface Plan { id: string; name: string; priceGHS: number; priceYearlyGHS: number; features: string[] }
interface Sub { plan: string; status: string; currentPeriodEnd?: string }

function BillingInner() {
  const token = useAuth((s) => s.accessToken) ?? undefined;
  const qc = useQueryClient();
  const params = useSearchParams();
  const [busy, setBusy] = useState('');
  const [interval, setIntervalState] = useState<'monthly' | 'yearly'>('monthly');
  const [msg, setMsg] = useState('');

  const { data: me } = useMe();
  const { data: plans } = useQuery({ queryKey: ['plans'], queryFn: () => api.get<Plan[]>('/subscriptions/plans', token), enabled: !!token });
  const { data: sub } = useQuery({ queryKey: ['sub'], queryFn: () => api.get<Sub>('/subscriptions/me', token), enabled: !!token });

  if (me?.role === 'teacher') return <TeacherCommission />;

  // Verify a Paystack return.
  useEffect(() => {
    const ref = params.get('ref');
    if (ref && token) api.get<{ status: string }>(`/subscriptions/verify/${ref}`, token).then((r) => { setMsg(r.status === 'active' ? '✓ Subscription active!' : 'Payment pending.'); qc.invalidateQueries({ queryKey: ['sub'] }); });
  }, [params, token, qc]);

  const subscribe = async (plan: string) => {
    setBusy(plan); setMsg('');
    try {
      const r = await api.post<{ authorizationUrl?: string; dev?: boolean; message?: string }>('/subscriptions/subscribe', { plan, interval }, token);
      if (r.authorizationUrl) window.location.href = r.authorizationUrl;
      else { setMsg(r.message ?? 'Activated.'); qc.invalidateQueries({ queryKey: ['sub'] }); }
    } catch (e) { setMsg((e as Error).message); } finally { setBusy(''); }
  };
  const cancel = async () => { if (!confirm('Cancel your subscription?')) return; await api.post('/subscriptions/cancel', {}, token); qc.invalidateQueries({ queryKey: ['sub'] }); };

  const icon = (id: string) => id === 'premium' ? Crown : id === 'pro' ? Sparkles : Check;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold text-ink">Plans & billing</h1><p className="text-sm text-ink-soft">Unlock unlimited AI tutoring, bookings and premium tools.</p></div>
        <div className="inline-flex rounded-xl border border-gray-200 p-1 text-sm">
          <button onClick={() => setIntervalState('monthly')} className={`rounded-lg px-3 py-1.5 font-medium ${interval === 'monthly' ? 'bg-brand text-white' : 'text-ink-soft'}`}>Monthly</button>
          <button onClick={() => setIntervalState('yearly')} className={`rounded-lg px-3 py-1.5 font-medium ${interval === 'yearly' ? 'bg-brand text-white' : 'text-ink-soft'}`}>Yearly <span className="text-xs opacity-80">save ~17%</span></button>
        </div>
      </div>

      {sub && sub.plan !== 'free' && (
        <Card className="flex items-center justify-between bg-brand-soft/50">
          <div><p className="text-sm text-ink-soft">Current plan</p><p className="text-lg font-bold capitalize text-brand">{sub.plan} · <span className="capitalize">{sub.status}</span></p>
            {sub.currentPeriodEnd && <p className="text-xs text-ink-soft">Renews {new Date(sub.currentPeriodEnd).toLocaleDateString()}</p>}</div>
          <button onClick={cancel} className="rounded-xl border border-coral/40 px-4 py-2 text-sm font-medium text-coral">Cancel</button>
        </Card>
      )}
      {msg && <p className="text-sm font-medium text-brand">{msg}</p>}

      <div className="grid gap-4 md:grid-cols-3">
        {plans?.map((p) => {
          const Icon = icon(p.id);
          const current = sub?.plan === p.id && sub?.status === 'active';
          const featured = p.id === 'pro';
          return (
            <Card key={p.id} className={featured ? 'ring-2 ring-brand' : ''}>
              {featured && <span className="mb-2 inline-block rounded-full bg-brand px-2 py-0.5 text-xs font-semibold text-white">Most popular</span>}
              <div className="flex items-center gap-2"><Icon className="h-5 w-5 text-brand" /><p className="text-lg font-bold text-ink">{p.name}</p></div>
              <p className="mt-1 text-3xl font-extrabold text-ink">₵{interval === 'yearly' ? p.priceYearlyGHS : p.priceGHS}<span className="text-sm font-normal text-ink-soft">/{interval === 'yearly' ? 'yr' : 'mo'}</span></p>
              <ul className="mt-3 space-y-1.5">{p.features.map((f) => <li key={f} className="flex items-start gap-2 text-sm text-ink-soft"><Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> {f}</li>)}</ul>
              {p.id === 'free' ? <p className="mt-4 text-center text-sm text-ink-soft">Default plan</p>
                : current ? <p className="mt-4 rounded-xl bg-brand-soft py-2 text-center text-sm font-semibold text-brand">✓ Your plan</p>
                : <button onClick={() => subscribe(p.id)} disabled={!!busy} className="mt-4 w-full rounded-xl bg-brand py-2 text-sm font-semibold text-white">{busy === p.id ? '…' : `Upgrade to ${p.name}`}</button>}
            </Card>
          );
        })}
      </div>
      <p className="text-xs text-ink-soft">Paid plans renew automatically each month via Paystack (cards + Mobile Money); cancel anytime. Without a Paystack key, plans activate in dev mode so you can test the flow.</p>
    </div>
  );
}

export default function Billing() {
  return <Suspense fallback={<p className="text-ink-soft">Loading…</p>}><BillingInner /></Suspense>;
}

function TeacherCommission() {
  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div><h1 className="text-2xl font-bold text-ink">Your earnings model</h1><p className="text-sm text-ink-soft">Teachers don’t pay a subscription on Learnova.</p></div>
      <Card className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-soft text-xl font-black text-brand">18%</span>
          <div><p className="font-bold text-ink">Commission-based</p><p className="text-sm text-ink-soft">You keep 82% of everything students pay you.</p></div>
        </div>
        <div className="rounded-xl bg-gray-50 p-3 text-sm text-ink-soft">
          <p>Example: a student pays <span className="font-semibold text-ink">₵100</span> for a session →</p>
          <p className="mt-1">You receive <span className="font-semibold text-brand">₵82</span>, Learnova’s commission is <span className="font-semibold text-ink">₵18</span>.</p>
        </div>
        <p className="text-sm text-ink-soft">Commission is deducted automatically when a payment settles — nothing to set up, no monthly fees.</p>
        <Link href="/earnings" className="inline-block rounded-xl bg-brand px-5 py-2 text-sm font-semibold text-white">View earnings & withdraw →</Link>
      </Card>
    </div>
  );
}
