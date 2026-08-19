'use client';
import { LevelDashboard } from '@/components/LevelDashboard';
import { KidsDashboard } from '@/components/KidsDashboard';
import { SchoolBanner } from '@/components/SchoolBanner';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Search, Sparkles, TrendingUp, ClipboardCheck, FlaskConical, ShoppingBag, BookOpen,
  Trophy, Award, Compass, Users, Wallet, ShieldCheck, Building2, BadgeCheck, LayoutDashboard,
  Flame, Star, ArrowRight, type LucideIcon,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';
import { useMe } from '@/features/profile/useMe';

type Tint = 'brand' | 'gold' | 'coral' | 'sky' | 'violet' | 'indigo';
type Tile = { href: string; title: string; desc: string; icon: LucideIcon; tint: Tint };

const TINT: Record<Tint, string> = {
  brand: 'bg-brand-soft text-brand', gold: 'bg-gold-soft text-gold-dark', coral: 'bg-coral-soft text-coral',
  sky: 'bg-sky-50 text-sky-600', violet: 'bg-violet-50 text-violet-600', indigo: 'bg-indigo-50 text-indigo-600',
};

const TILES: Record<string, Tile[]> = {
  student: [
    { href: '/companion', title: 'AI Companion', desc: 'Your personal study buddy', icon: Sparkles, tint: 'violet' },
    { href: '/learn', title: 'Learning path', desc: 'What to study next', icon: TrendingUp, tint: 'sky' },
    { href: '/exams', title: 'Exam prep', desc: 'WASSCE, BECE & more', icon: ClipboardCheck, tint: 'gold' },
    { href: '/labs', title: 'Virtual labs', desc: 'Hands-on practicals', icon: FlaskConical, tint: 'indigo' },
    { href: '/workspace', title: 'Assignment workspace', desc: 'AI review & plagiarism check', icon: ClipboardCheck, tint: 'sky' },
    { href: '/marketplace', title: 'Marketplace', desc: 'Courses & past questions', icon: ShoppingBag, tint: 'coral' },
    { href: '/library', title: 'Library', desc: 'E-books & notes', icon: BookOpen, tint: 'brand' },
    { href: '/leaderboard', title: 'Leaderboard', desc: 'Earn XP & badges', icon: Trophy, tint: 'gold' },
    { href: '/scholarships', title: 'Scholarships', desc: 'Grants & opportunities', icon: Award, tint: 'sky' },
    { href: '/career', title: 'Career mentor', desc: 'AI career guidance', icon: Compass, tint: 'violet' },
    { href: '/community', title: 'Community', desc: 'Study groups & forums', icon: Users, tint: 'coral' },
  ],
  teacher: [
    { href: '/teacher', title: 'Dashboard', desc: 'Your overview', icon: LayoutDashboard, tint: 'brand' },
    { href: '/earnings', title: 'Earnings', desc: 'Balance & payouts', icon: Wallet, tint: 'gold' },
    { href: '/twin', title: 'AI Twin', desc: 'Train on your lessons', icon: Sparkles, tint: 'violet' },
    { href: '/marketplace', title: 'Sell content', desc: 'Courses & notes', icon: ShoppingBag, tint: 'coral' },
    { href: '/bookings', title: 'Sessions', desc: 'Your schedule', icon: ClipboardCheck, tint: 'sky' },
  ],
  parent: [
    { href: '/children', title: 'My children', desc: 'Monitor progress', icon: Users, tint: 'brand' },
    { href: '/scholarships', title: 'Scholarships', desc: 'Opportunities', icon: Award, tint: 'gold' },
  ],
  school_admin: [
    { href: '/admin', title: 'Admin control', desc: 'Users, stats & AI status', icon: ShieldCheck, tint: 'brand' },
    { href: '/school', title: 'School dashboard', desc: 'Stats & roster', icon: Building2, tint: 'sky' },
    { href: '/certificates', title: 'Certificates', desc: 'Issue & verify', icon: BadgeCheck, tint: 'gold' },
  ],
  super_admin: [
    { href: '/admin', title: 'Admin control', desc: 'Platform users, stats & AI', icon: ShieldCheck, tint: 'brand' },
    { href: '/school', title: 'School dashboard', desc: 'Tenant stats', icon: Building2, tint: 'sky' },
    { href: '/certificates', title: 'Certificates', desc: 'Issue & verify', icon: BadgeCheck, tint: 'gold' },
  ],
};

function StatChips() {
  const token = useAuth((s) => s.accessToken) ?? undefined;
  const { data } = useQuery({
    queryKey: ['home-gami'],
    queryFn: () => api.get<{ xp: number; level: number; streak?: { count: number } }>('/gamification/me', token),
    enabled: !!token,
  });
  const items = [
    { label: 'Level', value: data?.level ?? 1, icon: Star },
    { label: 'XP', value: data?.xp ?? 0, icon: Trophy },
    { label: 'Day streak', value: data?.streak?.count ?? 0, icon: Flame },
  ];
  return (
    <div className="flex flex-wrap gap-2.5">
      {items.map((s) => (
        <div key={s.label} className="glass inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-white">
          <s.icon className="h-4 w-4 text-gold" />
          <span className="font-bold">{s.value}</span><span className="text-sm text-white/80">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

function FeatureCard({ href, title, desc, icon: Icon, gradient, delay }: {
  href: string; title: string; desc: string; icon: LucideIcon; gradient: string; delay: number;
}) {
  return (
    <Link href={href} className="animate-fade-up" style={{ animationDelay: `${delay}ms` }}>
      <div className={`group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl ${gradient} p-6 text-white shadow-lift`}>
        <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10 transition group-hover:scale-125" />
        <Icon className="relative h-8 w-8" />
        <div className="relative mt-6">
          <h3 className="text-xl font-extrabold">{title}</h3>
          <p className="mt-1 text-white/80">{desc}</p>
          <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold">
            Open <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function HomeDashboard() {
  const { data: me } = useMe();
  const role = me?.role ?? 'student';
  const tiles = TILES[role] ?? TILES.student;
  const first = me?.name?.split(' ')[0];
  const isStudent = role === 'student';

  // Young learners get a completely playful, simplified dashboard.
  if (isStudent && (me?.educationLevel === 'KG' || me?.educationLevel === 'Primary')) {
    return <div className="space-y-6"><KidsDashboard /></div>;
  }

  return (
    <div className="space-y-6">
      <SchoolBanner />

      {/* Students lead with their personalised, level-themed banner + live classes */}
      {isStudent ? (
        <LevelDashboard />
      ) : (
        <section className="relative overflow-hidden rounded-3xl bg-[#0a5d43] p-8 text-white shadow-lift sm:p-10">
          <div className="aurora">
            <span className="aurora-blob h-56 w-56 bg-emerald-400" style={{ top: '-10%', left: '5%' }} />
            <span className="aurora-blob h-64 w-64 bg-brand" style={{ bottom: '-20%', right: '8%', animationDelay: '4s' }} />
            <span className="aurora-blob h-48 w-48 bg-gold" style={{ top: '30%', left: '55%', animationDelay: '8s' }} />
          </div>
          <div className="relative z-10 animate-fade-up">
            <p className="text-sm font-medium text-white/70">Welcome back</p>
            <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">{first ? `Hello, ${first}` : 'Hello'} 👋</h1>
            <p className="mt-2 max-w-lg text-white/85">
              {role === 'teacher' ? 'Your students, earnings and AI Twin — all in one place.'
                : role === 'parent' ? 'Follow your child’s progress and find them great tutors.'
                : 'Manage your platform and keep everything running smoothly.'}
            </p>
          </div>
        </section>
      )}

      {/* Quick stats (students) */}
      {isStudent && (
        <section className="rounded-2xl bg-ink p-4">
          <StatChips />
        </section>
      )}

      {/* Spotlight features (students) */}
      {isStudent && (
        <section className="grid gap-4 md:grid-cols-2">
          <FeatureCard href="/tutors" title="Find a tutor" desc="AI-ranked for your subject, budget and language." icon={Search}
            gradient="bg-gradient-to-br from-brand to-emerald-600" delay={0} />
          <FeatureCard href="/companion" title="Ask Nova AI" desc="Your study assistant, ready 24/7 to help and explain." icon={Sparkles}
            gradient="bg-gradient-to-br from-violet-600 to-indigo-600" delay={80} />
        </section>
      )}

      {/* Explore tile grid */}
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-soft">{isStudent ? 'Explore everything' : 'Your tools'}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tiles.map((t, i) => (
            <Link key={t.href} href={t.href} className="animate-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="group flex h-full items-start gap-4 rounded-2xl border border-gray-200/80 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lift">
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${TINT[t.tint]}`}>
                  <t.icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-bold text-ink">{t.title}</h3>
                  <p className="text-sm text-ink-soft">{t.desc}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
