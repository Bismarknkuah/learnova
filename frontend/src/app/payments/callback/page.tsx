'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';

function CallbackInner() {
  const params = useSearchParams();
  const router = useRouter();
  const token = useAuth((s) => s.accessToken) ?? undefined;
  const reference = params.get('reference') ?? params.get('trxref');
  const [state, setState] = useState<'checking' | 'paid' | 'failed'>('checking');

  useEffect(() => {
    if (!reference) { setState('failed'); return; }
    api.get<{ status: string }>(`/payments/verify/${reference}`, token)
      .then((r) => setState(r.status === 'paid' ? 'paid' : 'failed'))
      .catch(() => setState('failed'));
  }, [reference, token]);

  return (
    <main className="grid min-h-screen place-items-center p-6">
      <div className="w-full max-w-sm rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-card">
        {state === 'checking' && <><Loader2 className="mx-auto h-10 w-10 animate-spin text-brand" /><p className="mt-3 text-ink-soft">Confirming your payment…</p></>}
        {state === 'paid' && <><CheckCircle2 className="mx-auto h-12 w-12 text-brand" /><h1 className="mt-3 text-xl font-bold text-ink">Payment successful</h1><p className="mt-1 text-sm text-ink-soft">The fee has been marked as paid.</p></>}
        {state === 'failed' && <><XCircle className="mx-auto h-12 w-12 text-coral" /><h1 className="mt-3 text-xl font-bold text-ink">Payment not confirmed</h1><p className="mt-1 text-sm text-ink-soft">If you were charged, it will reconcile shortly.</p></>}
        <button onClick={() => router.push('/children')} className="mt-5 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white">Back to portal</button>
      </div>
    </main>
  );
}

export default function PaymentCallback() {
  return <Suspense fallback={null}><CallbackInner /></Suspense>;
}
