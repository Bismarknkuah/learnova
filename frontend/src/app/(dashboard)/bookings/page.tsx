'use client';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, Check } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';

interface Booking { _id: string; type: string; startAt: string; priceGHS: number; status: string }
interface Slot { start: string; end: string }

function SmartSchedule({ tutorId }: { tutorId: string }) {
  const token = useAuth((s) => s.accessToken) ?? undefined;
  const qc = useQueryClient();
  const [msg, setMsg] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['suggest', tutorId],
    queryFn: () => api.get<{ slots: Slot[] }>(`/bookings/suggest?tutorId=${tutorId}&durationMin=60`, token),
    enabled: !!token,
  });

  const book = async (s: Slot) => {
    try {
      await api.post('/bookings', { tutorId, type: 'one_on_one', startAt: s.start, endAt: s.end }, token);
      setMsg('Session requested! See it below.');
      qc.invalidateQueries({ queryKey: ['bookings'] });
    } catch (e) { setMsg((e as Error).message); }
  };

  return (
    <Card className="mb-6">
      <h2 className="inline-flex items-center gap-2 font-semibold text-ink"><CalendarClock className="h-5 w-5 text-brand" /> Smart-scheduled times</h2>
      <p className="mt-1 text-sm text-ink-soft">Conflict-free slots the AI found over the next 7 days. Pick one to request it.</p>
      {msg && <p className="mt-2 text-sm text-brand">{msg}</p>}
      {isLoading ? <p className="mt-3 text-ink-soft">Finding open times…</p> : (
        <div className="mt-3 flex flex-wrap gap-2">
          {data?.slots?.slice(0, 8).map((s) => (
            <button key={s.start} onClick={() => book(s)}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm transition hover:border-brand hover:bg-brand-soft">
              {new Date(s.start).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit', month: 'short', day: 'numeric' })}
            </button>
          ))}
          {!data?.slots?.length && <p className="text-ink-soft">No open slots found — try another tutor.</p>}
        </div>
      )}
    </Card>
  );
}

function BookingsInner() {
  const token = useAuth((s) => s.accessToken) ?? undefined;
  const tutorId = useSearchParams().get('tutorId');
  const { data } = useQuery({ queryKey: ['bookings'], queryFn: () => api.get<Booking[]>('/bookings', token), enabled: !!token });

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-ink">Bookings</h1>
      {tutorId && <SmartSchedule tutorId={tutorId} />}
      <h2 className="mb-3 font-semibold text-ink">My sessions</h2>
      <div className="space-y-3">
        {data?.map((b) => (
          <Card key={b._id}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium capitalize">{b.type.replace('_', ' ')}</p>
                <p className="text-sm text-ink-soft">{new Date(b.startAt).toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-brand">₵{b.priceGHS}</p>
                <span className="inline-flex items-center gap-1 text-xs capitalize text-ink-soft">
                  {b.status === 'confirmed' && <Check className="h-3 w-3 text-brand" />}{b.status.replace('_', ' ')}
                </span>
              </div>
            </div>
          </Card>
        ))}
        {!data?.length && <p className="text-ink-soft">No bookings yet. Find a tutor and pick a suggested time.</p>}
      </div>
    </div>
  );
}

export default function BookingsPage() {
  return <Suspense fallback={null}><BookingsInner /></Suspense>;
}
