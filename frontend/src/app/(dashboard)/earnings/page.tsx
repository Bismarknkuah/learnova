'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Wallet, Banknote, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';

interface Balance { balanceGHS: number }
interface Withdrawal { _id: string; amountGHS: number; method: string; destination: string; status: string; createdAt?: string }
const METHODS = [['mtn_momo', 'MTN MoMo'], ['telecel', 'Telecel Cash'], ['airteltigo', 'AT Money'], ['bank', 'Bank']];

export default function EarningsPage() {
  const token = useAuth((s) => s.accessToken) ?? undefined;
  const qc = useQueryClient();
  const { data: bal } = useQuery({ queryKey: ['balance'], queryFn: () => api.get<Balance>('/payments/balance', token), enabled: !!token });
  const { data: history } = useQuery({ queryKey: ['withdrawals'], queryFn: () => api.get<Withdrawal[]>('/payments/withdrawals', token), enabled: !!token });
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('mtn_momo');
  const [destination, setDestination] = useState('');
  const [busy, setBusy] = useState(false);

  const withdraw = async () => {
    setBusy(true);
    try {
      await api.post('/payments/withdrawals', { amountGHS: Number(amount), method, destination }, token);
      setAmount(''); setDestination('');
      qc.invalidateQueries({ queryKey: ['balance'] }); qc.invalidateQueries({ queryKey: ['withdrawals'] });
    } catch (e) { alert((e as Error).message); } finally { setBusy(false); }
  };

  const StatusIcon = ({ s }: { s: string }) => s === 'paid' ? <CheckCircle2 className="h-4 w-4 text-brand" /> : s === 'rejected' ? <XCircle className="h-4 w-4 text-coral" /> : <Clock className="h-4 w-4 text-gold-dark" />;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-2xl font-bold text-ink">Earnings & payouts</h1>

      <Card className="flex items-center justify-between">
        <div><p className="text-sm text-ink-soft">Available balance</p><p className="text-3xl font-bold text-brand">₵{bal?.balanceGHS?.toFixed(2) ?? '0.00'}</p></div>
        <Wallet className="h-10 w-10 text-brand/30" />
      </Card>

      <Card className="space-y-3">
        <p className="inline-flex items-center gap-2 font-semibold text-ink"><Banknote className="h-5 w-5 text-brand" /> Withdraw</p>
        <div className="flex flex-wrap gap-2">
          <input type="number" placeholder="Amount ₵" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          <select value={method} onChange={(e) => setMethod(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">{METHODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          <input placeholder={method === 'bank' ? 'Account number' : 'MoMo phone'} value={destination} onChange={(e) => setDestination(e.target.value)} className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          <button onClick={withdraw} disabled={busy || !amount || destination.length < 5} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">Request</button>
        </div>
        <p className="text-xs text-ink-soft">Payouts are reviewed by your school/admin. The amount is reserved from your balance immediately; if rejected it’s refunded.</p>
      </Card>

      <Card>
        <p className="mb-2 font-semibold text-ink">Payout history</p>
        <div className="space-y-2">
          {history?.map((w) => (
            <div key={w._id} className="flex items-center justify-between border-b border-gray-100 py-2 text-sm last:border-0">
              <span>₵{w.amountGHS} · {METHODS.find(([v]) => v === w.method)?.[1] ?? w.method} · {w.destination}</span>
              <span className="inline-flex items-center gap-1 capitalize text-ink-soft"><StatusIcon s={w.status} /> {w.status}</span>
            </div>
          ))}
          {!history?.length && <p className="text-sm text-ink-soft">No payout requests yet.</p>}
        </div>
      </Card>
    </div>
  );
}
