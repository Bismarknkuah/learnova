'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Sparkles } from 'lucide-react';
import { TutorCard, type TutorCardData } from '@/components/tutors/TutorCard';
import { useTutors, type TutorFilters } from '@/features/tutors/useTutors';
import { useMe } from '@/features/profile/useMe';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';

const LANGS = ['', 'English', 'Twi', 'Ewe', 'Ga', 'Hausa', 'French'];
const STYLES = ['', 'structured', 'exam-focused', 'conversational', 'visual', 'practical'];
const GENDERS = ['', 'male', 'female'];

export default function TutorsPage() {
  const router = useRouter();
  const [f, setF] = useState<TutorFilters>({});
  const set = (patch: Partial<TutorFilters>) => setF((p) => ({ ...p, ...patch }));
  const { data: tutors, isLoading } = useTutors(f);
  const { data: me } = useMe();
  const token = useAuth((s) => s.accessToken) ?? undefined;
  const [reviewTutor, setReviewTutor] = useState<TutorCardData | null>(null);
  const becomePeer = async () => {
    const rate = prompt('Set your peer-tutor rate (₵ per hour):', '20');
    if (rate == null) return;
    try { const r = await api.post<{ certified: boolean }>('/tutors/peer-register', { hourlyRateGHS: Number(rate) }, token);
      alert(r.certified ? 'You are now a Certified peer tutor!' : 'You are now a peer tutor. Earn XP to get certified.'); }
    catch (e) { alert((e as Error).message); }
  };

  // The backend AI-ranks for students; the top picks become "Recommended for You".
  const recommended = (tutors ?? []).slice(0, 3);
  const rest = (tutors ?? []).slice(3);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Find a tutor</h1>
        <p className="text-ink-soft">AI-matched on subject, budget, language, style and more.</p>
      </div>

      {/* Filters */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={f.subject ?? ''} onChange={(e) => set({ subject: e.target.value || undefined })}
            placeholder="Subject — e.g. Physics"
            className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
        </div>
        <input type="number" placeholder="Max ₵/hr" value={f.maxPriceGHS ?? ''}
          onChange={(e) => set({ maxPriceGHS: e.target.value ? Number(e.target.value) : undefined })}
          className="rounded-xl border border-gray-300 bg-white px-3 py-2.5 outline-none focus:border-brand" />
        <select value={f.language ?? ''} onChange={(e) => set({ language: e.target.value || undefined })} className="rounded-xl border border-gray-300 bg-white px-3 py-2.5">
          <option value="">Any language</option>{LANGS.filter(Boolean).map((l) => <option key={l}>{l}</option>)}
        </select>
        <select value={f.teachingStyle ?? ''} onChange={(e) => set({ teachingStyle: e.target.value || undefined })} className="rounded-xl border border-gray-300 bg-white px-3 py-2.5">
          <option value="">Any teaching style</option>{STYLES.filter(Boolean).map((l) => <option key={l}>{l}</option>)}
        </select>
        <select value={f.gender ?? ''} onChange={(e) => set({ gender: e.target.value || undefined })} className="rounded-xl border border-gray-300 bg-white px-3 py-2.5">
          <option value="">Any gender</option>{GENDERS.filter(Boolean).map((l) => <option key={l} className="capitalize">{l}</option>)}
        </select>
        <select value={f.minRating ? String(f.minRating) : ''} onChange={(e) => set({ minRating: e.target.value ? Number(e.target.value) : undefined })} className="rounded-xl border border-gray-300 bg-white px-3 py-2.5">
          <option value="">Any rating</option><option value="4">4★ & up</option><option value="4.5">4.5★ & up</option>
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => set({ isPeer: f.isPeer ? undefined : true })} className={`rounded-xl px-3 py-1.5 text-sm font-medium ${f.isPeer ? 'bg-violet-600 text-white' : 'border border-gray-200 hover:border-brand'}`}>Peer tutors</button>
        {me?.role === 'student' && <button onClick={becomePeer} className="rounded-xl border border-gray-200 px-3 py-1.5 text-sm font-medium hover:border-brand">Become a peer tutor →</button>}
      </div>

      {isLoading && <p className="text-ink-soft">Finding your best matches…</p>}

      {/* Recommended for You */}
      {!isLoading && recommended.length > 0 && (
        <section>
          <h2 className="mb-3 inline-flex items-center gap-2 text-lg font-semibold text-ink">
            <Sparkles className="h-5 w-5 text-violet-600" /> Recommended for You
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recommended.map((t) => <TutorCard key={t.id} t={t} onBook={() => router.push(`/bookings?tutorId=${t.id}`)} onReview={me?.role === 'student' ? setReviewTutor : undefined} />)}
          </div>
        </section>
      )}

      {/* All matches */}
      {rest.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-ink">More tutors</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((t) => <TutorCard key={t.id} t={t} onBook={() => router.push(`/bookings?tutorId=${t.id}`)} onReview={me?.role === 'student' ? setReviewTutor : undefined} />)}
          </div>
        </section>
      )}

      {!isLoading && tutors?.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center text-ink-soft">No tutors match these filters yet.</div>
      )}
      {reviewTutor && <ReviewModal t={reviewTutor} token={token} onClose={() => setReviewTutor(null)} />}
    </div>
  );
}

function ReviewModal({ t, token, onClose }: { t: TutorCardData; token?: string; onClose: () => void }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviews, setReviews] = useState<{ _id: string; rating: number; comment?: string; studentId?: { name?: string } }[]>([]);
  const [busy, setBusy] = useState(false);
  useState(() => { api.get<typeof reviews>(`/tutors/${t.id}/reviews`, token).then(setReviews).catch(() => {}); });
  const submit = async () => {
    setBusy(true);
    try { await api.post(`/tutors/${t.id}/reviews`, { rating, comment }, token); onClose(); alert('Thanks for your review!'); }
    catch (e) { alert((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-ink">Review {t.name ?? 'tutor'}</h3>
        <div className="mt-3 flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => <button key={n} onClick={() => setRating(n)} className={`text-2xl ${n <= rating ? 'text-gold' : 'text-gray-300'}`}>★</button>)}
        </div>
        <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder="Share your experience…" className="mt-3 w-full rounded-xl border border-gray-300 p-3 text-sm outline-none focus:border-brand" />
        <button onClick={submit} disabled={busy} className="mt-3 w-full rounded-xl bg-brand py-2 text-sm font-semibold text-white">{busy ? 'Submitting…' : 'Submit review'}</button>
        {reviews.length > 0 && <div className="mt-4 max-h-40 space-y-2 overflow-y-auto border-t border-gray-100 pt-3">
          {reviews.map((r) => <div key={r._id} className="text-sm"><span className="text-gold">{'★'.repeat(r.rating)}</span> <span className="font-medium">{r.studentId?.name ?? 'Student'}</span><p className="text-ink-soft">{r.comment}</p></div>)}
        </div>}
      </div>
    </div>
  );
}
