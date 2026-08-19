'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Megaphone, Plus, Clock, Coins, CheckCircle2, Send } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';
import { useMe } from '@/features/profile/useMe';

interface Applicant { tutorId: string; tutorName?: string; message?: string; rateGHS?: number }
interface Req { _id: string; subject: string; description?: string; level?: string; preferredAt?: string; durationMin?: number; budgetGHS?: number; status: string; studentName?: string; acceptedTutorId?: string; applicants?: Applicant[] }

export default function RequestsPage() {
  const { data: me } = useMe();
  const isTutor = me?.role === 'teacher' || me?.role === 'school_admin' || me?.role === 'super_admin';
  return <div className="space-y-5">{isTutor ? <TutorBoard /> : <StudentRequests />}</div>;
}

// -------- Student: post requests + review applicants --------
function StudentRequests() {
  const token = useAuth((s) => s.accessToken) ?? undefined;
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['my-requests'], queryFn: () => api.get<Req[]>('/bookings/requests', token), enabled: !!token });
  const [show, setShow] = useState(false);
  return (
    <>
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-ink">Request a tutor</h1><p className="text-sm text-ink-soft">Post exactly what you need — tutors apply, you choose.</p></div>
        <button onClick={() => setShow((v) => !v)} className="inline-flex items-center gap-1 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" /> Post request</button>
      </div>
      {show && <PostForm token={token} onDone={() => { setShow(false); qc.invalidateQueries({ queryKey: ['my-requests'] }); }} />}
      <div className="space-y-4">
        {data?.map((r) => <RequestCard key={r._id} r={r} token={token} onChange={() => qc.invalidateQueries({ queryKey: ['my-requests'] })} />)}
        {!data?.length && <p className="text-ink-soft">You haven’t posted any requests yet.</p>}
      </div>
    </>
  );
}

function PostForm({ token, onDone }: { token?: string; onDone: () => void }) {
  const [f, setF] = useState({ subject: '', description: '', preferredAt: '', durationMin: 60, budgetGHS: 0 });
  const submit = async () => {
    await api.post('/bookings/requests', { subject: f.subject, description: f.description || undefined, preferredAt: f.preferredAt || undefined, durationMin: f.durationMin, budgetGHS: f.budgetGHS }, token);
    onDone();
  };
  return (
    <Card className="space-y-2">
      <h3 className="font-semibold text-ink">New tutoring request</h3>
      <div className="grid gap-2 sm:grid-cols-2">
        <input placeholder="Subject (e.g. SHS Physics)" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        <label className="flex items-center gap-2 text-sm text-ink-soft">Preferred date & time <input type="datetime-local" value={f.preferredAt} onChange={(e) => setF({ ...f, preferredAt: e.target.value })} className="flex-1 rounded-lg border border-gray-300 px-2 py-1.5" /></label>
        <label className="flex items-center gap-2 text-sm text-ink-soft">Duration (min) <input type="number" value={f.durationMin} onChange={(e) => setF({ ...f, durationMin: Number(e.target.value) })} className="w-20 rounded-lg border border-gray-300 px-2 py-1" /></label>
        <label className="flex items-center gap-2 text-sm text-ink-soft">Budget (₵) <input type="number" value={f.budgetGHS} onChange={(e) => setF({ ...f, budgetGHS: Number(e.target.value) })} className="w-24 rounded-lg border border-gray-300 px-2 py-1" /></label>
        <textarea placeholder="What do you need help with?" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} rows={2} className="rounded-lg border border-gray-300 px-3 py-2 text-sm sm:col-span-2" />
      </div>
      <button onClick={submit} disabled={f.subject.trim().length < 2} className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Post for tutors to apply</button>
    </Card>
  );
}

function RequestCard({ r, token, onChange }: { r: Req; token?: string; onChange: () => void }) {
  const [note, setNote] = useState('');
  const accept = async (tutorId: string) => {
    const res = await api.post<{ needsPayment: boolean; booking: { _id: string; priceGHS: number } }>(`/bookings/requests/${r._id}/accept`, { tutorId }, token);
    setNote(res.needsPayment ? `Booked! Complete the ₵${res.booking.priceGHS} payment in Bookings to confirm.` : 'Booked and confirmed — see it under Bookings.');
    onChange();
  };
  return (
    <Card className="space-y-2">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-bold text-ink">{r.subject}</h3>
          <p className="text-xs text-ink-soft">{r.preferredAt ? new Date(r.preferredAt).toLocaleString() : 'Flexible time'} · {r.durationMin} min · {r.budgetGHS ? `₵${r.budgetGHS}` : 'Open budget'}</p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${r.status === 'matched' ? 'bg-brand-soft text-brand' : 'bg-gold-soft text-gold-dark'}`}>{r.status}</span>
      </div>
      {r.description && <p className="text-sm text-ink-soft">{r.description}</p>}
      {note && <p className="rounded-lg bg-brand-soft/60 p-2 text-sm font-medium text-brand">{note} <a href="/bookings" className="underline">Go to Bookings →</a></p>}
      <div>
        <p className="text-sm font-semibold text-ink">{r.applicants?.length ?? 0} tutor{(r.applicants?.length ?? 0) === 1 ? '' : 's'} applied</p>
        <div className="mt-1 space-y-2">
          {r.applicants?.map((a) => (
            <div key={a.tutorId} className="flex items-center justify-between rounded-xl border border-gray-100 p-2.5">
              <div><p className="text-sm font-semibold text-ink">{a.tutorName ?? 'Tutor'}{a.rateGHS != null ? ` · ₵${a.rateGHS}` : ''}</p>{a.message && <p className="text-xs text-ink-soft">{a.message}</p>}</div>
              {r.status === 'open' ? <button onClick={() => accept(a.tutorId)} className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white">Choose</button>
                : r.acceptedTutorId === a.tutorId ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand"><CheckCircle2 className="h-3.5 w-3.5" /> Chosen</span> : null}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// -------- Tutor: browse open requests + apply --------
function TutorBoard() {
  const token = useAuth((s) => s.accessToken) ?? undefined;
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['open-requests'], queryFn: () => api.get<Req[]>('/bookings/requests', token), enabled: !!token });
  return (
    <>
      <div><h1 className="inline-flex items-center gap-2 text-2xl font-bold text-ink"><Megaphone className="h-6 w-6 text-brand" /> Open student requests</h1><p className="text-sm text-ink-soft">Students looking for help — apply to teach them.</p></div>
      <div className="grid gap-4 sm:grid-cols-2">
        {data?.map((r) => <ApplyCard key={r._id} r={r} token={token} onDone={() => qc.invalidateQueries({ queryKey: ['open-requests'] })} />)}
        {!data?.length && <p className="text-ink-soft">No open requests right now.</p>}
      </div>
    </>
  );
}

function ApplyCard({ r, token, onDone }: { r: Req; token?: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [rateGHS, setRate] = useState<number>(r.budgetGHS ?? 0);
  const [applied, setApplied] = useState(false);
  const apply = async () => { try { await api.post(`/bookings/requests/${r._id}/apply`, { message, rateGHS }, token); setApplied(true); onDone(); } catch (e) { alert((e as Error).message); } };
  return (
    <Card className="space-y-2">
      <h3 className="font-bold text-ink">{r.subject}</h3>
      <p className="text-xs text-ink-soft">by {r.studentName ?? 'Student'} · <Clock className="inline h-3 w-3" /> {r.preferredAt ? new Date(r.preferredAt).toLocaleString() : 'Flexible'} · <Coins className="inline h-3 w-3" /> {r.budgetGHS ? `₵${r.budgetGHS}` : 'Open'}</p>
      {r.description && <p className="text-sm text-ink-soft">{r.description}</p>}
      {applied ? <p className="inline-flex items-center gap-1 text-sm font-semibold text-brand"><CheckCircle2 className="h-4 w-4" /> Applied</p> : !open ? (
        <button onClick={() => setOpen(true)} className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white">Apply</button>
      ) : (
        <div className="space-y-2">
          <input placeholder="Message to the student" value={message} onChange={(e) => setMessage(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          <label className="flex items-center gap-2 text-sm text-ink-soft">Your rate (₵) <input type="number" value={rateGHS} onChange={(e) => setRate(Number(e.target.value))} className="w-24 rounded-lg border border-gray-300 px-2 py-1" /></label>
          <button onClick={apply} className="inline-flex items-center gap-1 rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white"><Send className="h-4 w-4" /> Send application</button>
        </div>
      )}
    </Card>
  );
}
