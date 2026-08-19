'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar } from 'lucide-react';

interface Cls { _id: string; title?: string; hostName?: string; level?: string; priceGHS?: number; status: string; subject?: string; createdAt?: string }
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

// Fallback shown if the backend has no classes yet or is unreachable.
const FALLBACK = [
  { d: '02', m: 'Jul', title: 'Live WASSCE Physics Revision', venue: 'Live Classroom · Free' },
  { d: '05', m: 'Jul', title: 'BECE Maths Clinic: Quadratics', venue: 'Live Classroom' },
  { d: '12', m: 'Jul', title: 'Careers Webinar: Studying Abroad', venue: 'Live Classroom · Free' },
];

export function UpcomingClasses() {
  const [classes, setClasses] = useState<Cls[] | null>(null);
  useEffect(() => {
    fetch(`${API}/api/v1/public/classes`).then((r) => r.json()).then((j) => setClasses(j.data ?? [])).catch(() => setClasses([]));
  }, []);

  const live = classes && classes.length > 0;
  const rows = live
    ? classes!.map((c) => {
        const dt = c.createdAt ? new Date(c.createdAt) : new Date();
        return { d: String(dt.getDate()).padStart(2, '0'), m: dt.toLocaleString('en', { month: 'short' }),
          title: c.title ?? 'Live Class', venue: `${c.hostName ? c.hostName + ' · ' : ''}${(c.priceGHS ?? 0) > 0 ? '₵' + c.priceGHS : 'Free'}${c.level && c.level !== 'Any' ? ' · ' + c.level : ''}`, isLive: c.status === 'live' };
      })
    : FALLBACK.map((f) => ({ ...f, isLive: false }));

  return (
    <div className="mt-4 space-y-4">
      {rows.map((e, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-gray-100 pb-4">
          <div className="text-center"><p className="text-xs uppercase text-ink-soft">{e.m}</p><p className="text-3xl font-extrabold text-brand">{e.d}</p></div>
          <div>
            <p className="flex items-center gap-2 font-bold text-ink">{e.isLive && <span className="inline-flex items-center gap-1 rounded-md bg-coral/10 px-1.5 py-0.5 text-[11px] font-bold text-coral"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-coral" />LIVE</span>}{e.title}</p>
            <p className="inline-flex items-center gap-1 text-sm text-ink-soft"><Calendar className="h-3.5 w-3.5" /> {e.venue}</p>
          </div>
        </div>
      ))}
      <Link href="/register" className="inline-block text-sm font-semibold text-brand">Join Learnova to attend →</Link>
    </div>
  );
}
