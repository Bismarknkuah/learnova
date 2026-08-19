'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Trophy, Coins, Flame, Star, Gift, Crown, Medal } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';

interface Profile { xp: number; coins: number; level: number; streak?: { count: number }; badges?: { code: string; label: string }[]; perks?: { marketplaceDiscountPct?: number; premium?: boolean; scholarshipFastTrack?: boolean }; redeemed?: { reward: string }[] }
interface Rank { _id: string; name?: string; xp: number; level: number; userId?: { name?: string } }

const REWARDS = [
  { id: 'discount', xp: 500, icon: Gift, title: '5% marketplace discount', tint: 'text-brand' },
  { id: 'premium', xp: 1500, icon: Star, title: 'Premium AI tutor access', tint: 'text-gold-dark' },
  { id: 'scholarship', xp: 3000, icon: Crown, title: 'Scholarship fast-track', tint: 'text-violet-600' },
];

export default function Leaderboard() {
  const token = useAuth((s) => s.accessToken) ?? undefined;
  const { data: me } = useQuery({ queryKey: ['gami-me'], queryFn: () => api.get<Profile>('/gamification/me', token), enabled: !!token });
  const { data: board } = useQuery({ queryKey: ['leaderboard'], queryFn: () => api.get<Rank[]>('/gamification/leaderboard', token), enabled: !!token });
  const qc = useQueryClient();
  const xp = me?.xp ?? 0;
  const redeem = async (id: string) => {
    try { await api.post('/gamification/redeem', { reward: id }, token); qc.invalidateQueries({ queryKey: ['gami-me'] }); }
    catch (e) { alert((e as Error).message); }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Rewards & leaderboard</h1>

      {/* My stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="text-center"><Trophy className="mx-auto h-6 w-6 text-gold-dark" /><p className="mt-1 text-2xl font-bold text-ink">{xp}</p><p className="text-xs text-ink-soft">XP · Level {me?.level ?? 1}</p></Card>
        <Card className="text-center"><Coins className="mx-auto h-6 w-6 text-gold" /><p className="mt-1 text-2xl font-bold text-ink">{me?.coins ?? 0}</p><p className="text-xs text-ink-soft">Coins</p></Card>
        <Card className="text-center"><Flame className="mx-auto h-6 w-6 text-coral" /><p className="mt-1 text-2xl font-bold text-ink">{me?.streak?.count ?? 0}</p><p className="text-xs text-ink-soft">Day streak</p></Card>
        <Card className="text-center"><Medal className="mx-auto h-6 w-6 text-brand" /><p className="mt-1 text-2xl font-bold text-ink">{me?.badges?.length ?? 0}</p><p className="text-xs text-ink-soft">Badges</p></Card>
      </div>

      {/* Badges */}
      {me?.badges && me.badges.length > 0 && (
        <Card>
          <p className="mb-2 font-semibold text-ink">Your badges</p>
          <div className="flex flex-wrap gap-2">{me.badges.map((b) => <span key={b.code} className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-3 py-1 text-sm font-medium text-brand"><Star className="h-3.5 w-3.5" /> {b.label}</span>)}</div>
        </Card>
      )}

      {/* Rewards ladder */}
      <div>
        <h2 className="mb-2 font-semibold text-ink">Rewards</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {REWARDS.map((r) => {
            const unlocked = xp >= r.xp;
            const active = me?.redeemed?.some((x) => x.reward === r.id);
            return (
              <Card key={r.id} className={active ? 'border-brand bg-brand-soft/30' : unlocked ? 'border-brand' : 'opacity-70'}>
                <r.icon className={`h-6 w-6 ${r.tint}`} />
                <p className="mt-1 font-semibold text-ink">{r.title}</p>
                {active ? <p className="mt-1 text-xs font-semibold text-brand">✓ Active</p>
                  : unlocked ? <button onClick={() => redeem(r.id)} className="mt-2 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white">Redeem</button>
                  : <p className="mt-1 text-xs text-ink-soft">{r.xp - xp} XP to go</p>}
              </Card>
            );
          })}
        </div>
      </div>

      {/* Leaderboard */}
      <div>
        <h2 className="mb-2 font-semibold text-ink">Top students</h2>
        <Card className="divide-y divide-gray-100">
          {board?.map((r, i) => (
            <div key={r._id} className="flex items-center justify-between py-2.5">
              <span className="inline-flex items-center gap-3">
                <span className={`grid h-7 w-7 place-items-center rounded-full text-sm font-bold ${i === 0 ? 'bg-gold text-white' : i === 1 ? 'bg-gray-300 text-white' : i === 2 ? 'bg-amber-700 text-white' : 'bg-gray-100 text-ink-soft'}`}>{i + 1}</span>
                <span className="font-medium text-ink">{r.userId?.name ?? r.name ?? 'Student'}</span>
              </span>
              <span className="text-sm text-ink-soft">Lv {r.level} · {r.xp} XP</span>
            </div>
          ))}
          {!board?.length && <p className="py-3 text-sm text-ink-soft">No rankings yet.</p>}
        </Card>
      </div>
    </div>
  );
}
