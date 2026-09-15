'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';
import { useMe } from '@/features/profile/useMe';
import {
  Home, Search, CalendarDays, Sparkles, Bot, Languages, TrendingUp, ClipboardCheck, GraduationCap,
  FlaskConical, FileEdit, Compass, MessagesSquare, Briefcase, BadgeCheck, ShoppingBag, BookOpen, Award,
  Trophy, Users2, Newspaper, FlaskRound, Wallet, LayoutDashboard, Building2, Baby, ShieldCheck,
  Menu, X, LogOut, MessageSquare, CreditCard, Settings, Video, UserCircle, Brain, ClipboardList, Megaphone, SlidersHorizontal, type LucideIcon } from 'lucide-react';

type Item = { href: string; label: string; icon: LucideIcon };
type Group = { title: string; items: Item[] };

const COMMON: Group = { title: 'Explore', items: [
  { href: '/marketplace', label: 'Marketplace', icon: ShoppingBag },
  { href: '/library', label: 'Library', icon: BookOpen },
  { href: '/scholarships', label: 'Scholarships', icon: Award },
  { href: '/community', label: 'Community', icon: Users2 },
  { href: '/feed', label: 'Campus Feed', icon: Newspaper },
  { href: '/research', label: 'Research Hub', icon: FlaskRound },
  { href: '/leaderboard', label: 'Rewards', icon: Trophy },
]};

const BY_ROLE: Record<string, Group[]> = {
  student: [
    { title: 'Learn', items: [
      { href: '/learn', label: 'Learning Path', icon: TrendingUp },
      { href: '/classroom', label: 'Live Classes', icon: Video },
      { href: '/tutors', label: 'Find Tutors', icon: Search },
      { href: '/bookings', label: 'Bookings', icon: CalendarDays },
      { href: '/exams', label: 'Exams', icon: ClipboardCheck },
    { href: '/assignments', label: 'Assignments', icon: ClipboardList },
    { href: '/requests', label: 'Requests', icon: Megaphone },
      { href: '/exam-prep', label: 'Exam Prep', icon: GraduationCap },
      { href: '/labs', label: 'Virtual Labs', icon: FlaskConical },
      { href: '/workspace', label: 'Workspace', icon: FileEdit },
    ]},
    { title: 'AI Tools', items: [
      { href: '/companion', label: 'AI Companion', icon: Sparkles },
      { href: '/twin', label: 'AI Twin', icon: Bot },
      { href: '/language-tutor', label: 'Language Tutor', icon: Languages },
      { href: '/research-assistant', label: 'Research AI', icon: FlaskRound },
      { href: '/interview', label: 'Interview Prep', icon: MessagesSquare },
    ]},
    { title: 'Career', items: [
      { href: '/career', label: 'Career Mentor', icon: Compass },
      { href: '/portfolio', label: 'Portfolio', icon: Briefcase },
      { href: '/certificates', label: 'Certificates', icon: BadgeCheck },
    ]},
  ],
  teacher: [{ title: 'Teach', items: [
    { href: '/teacher', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/twin', label: 'AI Twin', icon: Bot },
    { href: '/train-ai', label: 'Train AI · earn', icon: Brain },
    { href: '/assignments', label: 'Assignments', icon: ClipboardList },
    { href: '/requests', label: 'Requests', icon: Megaphone },
    { href: '/bookings', label: 'Sessions', icon: CalendarDays },
    { href: '/classroom', label: 'Live Classes', icon: Video },
    { href: '/teacher-profile', label: 'Teaching Profile', icon: BadgeCheck },
    { href: '/earnings', label: 'Earnings', icon: Wallet },
  ]}],
  parent: [{ title: 'Family', items: [{ href: '/children', label: 'My Children', icon: Baby }]}],
  school_admin: [{ title: 'Manage', items: [
    { href: '/school', label: 'School Portal', icon: Building2 },
    { href: '/admin', label: 'Admin', icon: ShieldCheck },
  ]}],
  super_admin: [{ title: 'Manage', items: [
    { href: '/school', label: 'School Portal', icon: Building2 },
    { href: '/admin', label: 'Admin', icon: ShieldCheck },
  ]}],
};

export function Sidebar() {
  const { data: me } = useMe();
  const logout = useAuth((s) => s.logout);
  const router = useRouter();
  const signOut = () => { logout(); router.push('/login'); };
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const account: Group = { title: 'Account', items: [
    { href: '/profile', label: 'My Profile', icon: UserCircle },
    { href: '/billing', label: 'Plans & Billing', icon: CreditCard },
    { href: '/settings', label: 'Settings', icon: Settings },
    ...(me?.role === 'super_admin' ? [{ href: '/system-settings', label: 'System Settings', icon: SlidersHorizontal }] : []),
  ] };
  // Admin-controlled feature visibility for this user's role.
  const token = useAuth((s) => s.accessToken) ?? undefined;
  const { data: featureCfg } = useQuery({
    queryKey: ['my-features'],
    queryFn: () => api.get<{ mine: string[] }>('/settings/features', token),
    enabled: !!token, staleTime: 60000,
  });
  const hidden = new Set(featureCfg?.mine ?? []);
  const rawGroups: Group[] = [{ title: 'Overview', items: [{ href: '/home', label: 'Home', icon: Home }, { href: '/messages', label: 'Messages', icon: MessageSquare }] }, ...(me?.role ? BY_ROLE[me.role] ?? [] : []), COMMON, account];
  // Drop any feature the admin disabled for this role (Home/Profile/Settings always kept).
  const KEEP = new Set(['/home', '/profile', '/settings', '/system-settings']);
  const groups: Group[] = rawGroups
    .map((g) => ({ ...g, items: g.items.filter((it) => KEEP.has(it.href) || !hidden.has(it.href)) }))
    .filter((g) => g.items.length > 0);

  const NavInner = (
    <div className="flex h-full flex-col">
      <Link href="/home" className="flex items-center gap-2 px-5 py-5">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand-dark text-sm font-black text-white">L</span>
        <span className="text-lg font-extrabold tracking-tight text-ink">Learnova</span>
      </Link>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-6">
        {groups.map((g) => (
          <div key={g.title}>
            <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">{g.title}</p>
            <div className="space-y-0.5">
              {g.items.map((it) => {
                const active = pathname === it.href || pathname.startsWith(it.href + '/');
                return (
                  <Link key={it.href} href={it.href} onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${active ? 'bg-brand text-white shadow-sm' : 'text-ink-soft hover:bg-brand-soft hover:text-brand'}`}>
                    <it.icon className="h-[18px] w-[18px]" /> {it.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-gray-100 p-3">
        <div className="flex items-center gap-3 rounded-xl px-3 py-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-soft font-bold text-brand">{me?.name?.[0] ?? '?'}</span>
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-ink">{me?.name}</p><p className="truncate text-xs capitalize text-ink-soft">{me?.role?.replace('_', ' ')}</p></div>
        </div>
        <button onClick={signOut} className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 py-2 text-sm font-semibold text-ink-soft transition hover:border-coral hover:bg-coral/5 hover:text-coral">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
        <p className="mt-2 text-center text-[10px] text-gray-300">Designed by Desward Technologies</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/home" className="font-extrabold text-brand">Learnova</Link>
        <button onClick={() => setOpen(true)}><Menu className="h-6 w-6 text-ink" /></button>
      </div>
      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 bg-white shadow-xl">
            <button onClick={() => setOpen(false)} className="absolute right-3 top-3 text-gray-400"><X className="h-5 w-5" /></button>
            {NavInner}
          </aside>
        </div>
      )}
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-gray-200 bg-white lg:block">{NavInner}</aside>
    </>
  );
}
