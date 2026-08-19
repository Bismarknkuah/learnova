'use client';
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { GraduationCap, Wallet, CalendarCheck, Bell, CreditCard, MessageCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';

interface Child { _id: string; name: string; email?: string; status: string }
interface Result { courseTitle: string; score: number; grade: string; term?: string }
interface Fee { _id: string; name?: string; amountGHS: number; status: string }
interface Att { title: string; at?: string }

export default function ParentPortal() {
  const token = useAuth((s) => s.accessToken) ?? undefined;
  const { data: children } = useQuery({ queryKey: ['children'], queryFn: () => api.get<Child[]>('/users/children', token), enabled: !!token });
  const [childId, setChildId] = useState<string | null>(null);
  useEffect(() => { if (children?.length && !childId) setChildId(children[0]._id); }, [children, childId]);

  const { data: results } = useQuery({ queryKey: ['c-results', childId], queryFn: () => api.get<Result[]>(`/parent/child/${childId}/results`, token), enabled: !!childId });
  const { data: fees } = useQuery({ queryKey: ['c-fees', childId], queryFn: () => api.get<Fee[]>(`/parent/child/${childId}/fees`, token), enabled: !!childId });
  const { data: attendance } = useQuery({ queryKey: ['c-att', childId], queryFn: () => api.get<Att[]>(`/parent/child/${childId}/attendance`, token), enabled: !!childId });

  const qc = useQueryClient();
  const pay = async (invoiceId: string) => {
    try {
      const init = await api.post<{ authorizationUrl?: string; reference?: string; dev?: boolean; alreadyPaid?: boolean }>('/payments/initialize', { invoiceId }, token);
      if (init.authorizationUrl) { window.location.href = init.authorizationUrl; return; }       // live Paystack
      if (init.reference) {                                                                        // dev mode: settle immediately
        await api.get(`/payments/verify/${init.reference}`, token);
        qc.invalidateQueries({ queryKey: ['c-fees', childId] });
        alert('Payment recorded. (Live Paystack checkout opens once PAYSTACK_SECRET_KEY is set.)');
      }
    } catch (e) { alert((e as Error).message); }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-ink">Parent portal</h1>

      {children && children.length > 0 ? (
        <>
          <div className="flex flex-wrap gap-2">
            {children.map((c) => (
              <button key={c._id} onClick={() => setChildId(c._id)} className={`rounded-xl px-4 py-2 text-sm font-medium ${childId === c._id ? 'bg-brand text-white' : 'border border-gray-200 hover:border-brand'}`}>{c.name}</button>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <p className="inline-flex items-center gap-2 font-semibold text-ink"><GraduationCap className="h-5 w-5 text-brand" /> Grades</p>
              <div className="mt-2 space-y-1.5">
                {results?.map((r, i) => <div key={i} className="flex justify-between border-b border-gray-100 py-1.5 text-sm last:border-0"><span>{r.courseTitle}{r.term ? ` · ${r.term}` : ''}</span><span className="font-semibold">{r.score} · {r.grade}</span></div>)}
                {!results?.length && <p className="text-sm text-ink-soft">No results posted yet.</p>}
              </div>
            </Card>

            <Card>
              <p className="inline-flex items-center gap-2 font-semibold text-ink"><Wallet className="h-5 w-5 text-gold-dark" /> Fees</p>
              <div className="mt-2 space-y-1.5">
                {fees?.map((f) => (
                  <div key={f._id} className="flex items-center justify-between border-b border-gray-100 py-1.5 text-sm last:border-0">
                    <span>{f.name ?? 'Fee'}</span>
                    <span className="flex items-center gap-2"><span className={f.status === 'paid' ? 'text-brand' : 'text-coral'}>₵{f.amountGHS} · {f.status}</span>
                      {f.status !== 'paid' && <button onClick={() => pay(f._id)} className="inline-flex items-center gap-1 rounded-lg bg-brand px-2 py-1 text-xs font-semibold text-white"><CreditCard className="h-3 w-3" /> Pay</button>}
                    </span>
                  </div>
                ))}
                {!fees?.length && <p className="text-sm text-ink-soft">No invoices yet.</p>}
              </div>
            </Card>

            <Card>
              <p className="inline-flex items-center gap-2 font-semibold text-ink"><CalendarCheck className="h-5 w-5 text-sky-600" /> Attendance</p>
              <div className="mt-2 space-y-1.5">
                {attendance?.map((a, i) => <div key={i} className="flex justify-between border-b border-gray-100 py-1.5 text-sm last:border-0"><span>{a.title ?? 'Class'}</span><span className="text-ink-soft">{a.at ? new Date(a.at).toLocaleDateString() : ''}</span></div>)}
                {!attendance?.length && <p className="text-sm text-ink-soft">No attendance records yet.</p>}
              </div>
            </Card>

            <Card>
              <p className="inline-flex items-center gap-2 font-semibold text-ink"><Bell className="h-5 w-5 text-coral" /> Alerts & teacher chat</p>
              <p className="mt-2 text-sm text-ink-soft">School announcements arrive in your notifications. You can message teachers directly.</p>
              <span className="mt-2 inline-flex items-center gap-1 text-sm text-ink-soft"><MessageCircle className="h-4 w-4" /> Direct messaging is available inside live classes</span>
            </Card>
          </div>
        </>
      ) : (
        <Card><p className="text-ink-soft">No children linked yet. Link your child from their student ID to monitor grades, fees and attendance.</p></Card>
      )}
    </div>
  );
}
