'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';

interface Me { name?: string }
interface Gami { xp?: number; streak?: number; coins?: number }
interface Session { _id: string; title?: string; status: string; level?: string }

// Big, colourful, friendly tiles for young learners (KG & Primary).
const TILES = [
  { href: '/learn', emoji: '📚', label: 'Fun Lessons', color: 'from-sky-400 to-blue-500' },
  { href: '/classroom', emoji: '🎥', label: 'Join Class', color: 'from-emerald-400 to-teal-500' },
  { href: '/library', emoji: '📖', label: 'Story Books', color: 'from-amber-400 to-orange-500' },
  { href: '/companion', emoji: '🤖', label: 'Ask Nova', color: 'from-violet-400 to-purple-500' },
  { href: '/leaderboard', emoji: '⭐', label: 'My Stars', color: 'from-pink-400 to-rose-500' },
  { href: '/labs', emoji: '🔬', label: 'Play & Learn', color: 'from-cyan-400 to-sky-500' },
];

export function KidsDashboard() {
  const token = useAuth((s) => s.accessToken) ?? undefined;
  const router = useRouter();
  const { data: me } = useQuery({ queryKey: ['me-kid'], queryFn: () => api.get<Me>('/users/me', token), enabled: !!token });
  const { data: gami } = useQuery({ queryKey: ['gami-kid'], queryFn: () => api.get<Gami>('/gamification/me', token), enabled: !!token });
  const { data: sessions } = useQuery({ queryKey: ['sessions-kid'], queryFn: () => api.get<Session[]>('/classrooms', token), enabled: !!token, refetchInterval: 15000 });

  const firstName = (me?.name ?? 'Friend').split(' ')[0];
  const stars = Math.max(1, Math.round((gami?.xp ?? 0) / 100));
  const liveClass = (sessions ?? []).find((s) => s.status === 'live');

  return (
    <div className="space-y-5">
      {/* Friendly greeting with mascot */}
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-yellow-300 via-orange-300 to-pink-300 p-6 text-center">
        <div className="text-6xl">🦉</div>
        <h1 className="mt-1 text-3xl font-black text-white drop-shadow-sm">Hi {firstName}! 👋</h1>
        <p className="mt-1 text-lg font-bold text-white/90">You have {stars} ⭐ — you&apos;re doing great!</p>
        <div className="mt-3 flex justify-center gap-2 text-sm font-bold">
          <span className="rounded-full bg-white/80 px-3 py-1 text-orange-600">🔥 {gami?.streak ?? 0} day streak</span>
          <span className="rounded-full bg-white/80 px-3 py-1 text-pink-600">🪙 {gami?.coins ?? 0} coins</span>
        </div>
      </div>

      {/* Live class — big and obvious if one is on */}
      {liveClass && (
        <button onClick={() => router.push(`/classroom/${liveClass._id}`)} className="flex w-full items-center justify-between rounded-[1.5rem] bg-gradient-to-r from-red-400 to-rose-500 p-5 text-left text-white shadow-lg">
          <div><p className="text-sm font-bold">🔴 Your class is LIVE now!</p><p className="text-xl font-black">{liveClass.title ?? 'Class'}</p></div>
          <span className="rounded-2xl bg-white px-5 py-3 text-lg font-black text-rose-500">Join! 🎉</span>
        </button>
      )}

      {/* Big colourful tiles */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {TILES.map((t) => (
          <Link key={t.href} href={t.href} className={`flex flex-col items-center justify-center rounded-[1.5rem] bg-gradient-to-br ${t.color} p-6 text-center text-white shadow-md transition hover:scale-[1.03] active:scale-95`}>
            <span className="text-5xl">{t.emoji}</span>
            <span className="mt-2 text-lg font-black drop-shadow-sm">{t.label}</span>
          </Link>
        ))}
      </div>

      <p className="text-center text-sm font-medium text-ink-soft">Tap a colourful button to start learning! 🌈</p>
    </div>
  );
}
