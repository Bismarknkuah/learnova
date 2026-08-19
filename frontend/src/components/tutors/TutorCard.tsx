'use client';
import { Star, BadgeCheck, Sparkles, Globe, GraduationCap } from 'lucide-react';

export interface TutorCardData {
  id: string; name: string; headline?: string; subjects?: string[]; languages?: string[];
  hourlyRateGHS: number; rating?: number; reviewsCount?: number; completedSessions?: number;
  ghanaCardVerified?: boolean; aiTwinEnabled?: boolean; why?: string[];
  gender?: string; teachingStyle?: string; country?: string; availability?: string[];
  isPeer?: boolean; peerCertified?: boolean;
}

const initials = (name: string) => name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

export function TutorCard({ t, onBook, onReview }: { t: TutorCardData; onBook?: (id: string) => void; onReview?: (t: TutorCardData) => void }) {
  return (
    <div className="group flex flex-col rounded-2xl border border-gray-200/80 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex items-start gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand to-emerald-500 font-bold text-white">
          {initials(t.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <h3 className="truncate font-bold text-ink">{t.name}</h3>
            {t.ghanaCardVerified && <BadgeCheck className="h-4 w-4 shrink-0 text-brand" aria-label="Verified" />}
          </div>
          <p className="truncate text-sm text-ink-soft">{t.headline}</p>
        </div>
        {t.aiTwinEnabled && (
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-600">
            <Sparkles className="h-3 w-3" /> AI Twin
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center gap-3 text-sm">
        <span className="inline-flex items-center gap-1 font-semibold text-gold-dark">
          <Star className="h-4 w-4 fill-gold text-gold" /> {t.rating?.toFixed(1) ?? '—'}
        </span>
        <button onClick={() => onReview?.(t)} className="text-ink-soft underline-offset-2 hover:text-brand hover:underline">{t.reviewsCount ?? 0} reviews</button>
        <span className="inline-flex items-center gap-1 text-ink-soft">
          <GraduationCap className="h-4 w-4" /> {t.completedSessions ?? 0} sessions
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {t.subjects?.slice(0, 3).map((s) => (
          <span key={s} className="rounded-lg bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand">{s}</span>
        ))}
        {t.teachingStyle && <span className="rounded-lg bg-gold-soft px-2 py-0.5 text-xs font-medium text-gold-dark">{t.teachingStyle}</span>}
        {t.isPeer && <span className="rounded-lg bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">Peer{t.peerCertified ? ' · Certified' : ''}</span>}
        {t.ghanaCardVerified && <span className="rounded-lg bg-brand px-2 py-0.5 text-xs font-medium text-white">✓ Verified Tutor</span>}
      </div>

      {t.languages?.length ? (
        <p className="mt-2 inline-flex items-center gap-1 text-xs text-ink-soft">
          <Globe className="h-3.5 w-3.5" /> {t.languages.join(', ')}
        </p>
      ) : null}

      {t.why?.length ? (
        <p className="mt-2 text-xs text-brand">✓ {t.why.slice(0, 2).join(' · ')}</p>
      ) : null}

      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
        <p><span className="text-lg font-extrabold text-ink">₵{t.hourlyRateGHS}</span><span className="text-sm text-ink-soft">/hr</span></p>
        <button
          onClick={() => onBook?.(t.id)}
          className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark active:scale-95">
          Book a session
        </button>
      </div>
    </div>
  );
}
