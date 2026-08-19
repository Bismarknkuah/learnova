'use client';
import Link from 'next/link';
import { useMe } from '@/features/profile/useMe';
import { useAuth } from '@/stores/auth';

/** Role-aware top navigation: every user sees the links relevant to their role. */
export function Nav() {
  const { data: me } = useMe();
  const logout = useAuth((s) => s.logout);
  const role = me?.role;

  const common = [
    { href: '/home', label: 'Home' },
    { href: '/marketplace', label: 'Marketplace' },
    { href: '/library', label: 'Library' },
    { href: '/scholarships', label: 'Scholarships' },
    { href: '/community', label: 'Community' },
      { href: '/feed', label: 'Feed' },
    { href: '/leaderboard', label: 'Leaderboard' },
  ];
  const byRole: Record<string, { href: string; label: string }[]> = {
    student: [
      { href: '/tutors', label: 'Find tutors' },
      { href: '/bookings', label: 'Bookings' },
      { href: '/twin', label: 'AI Twin' },
      { href: '/companion', label: 'Companion' },
      { href: '/language-tutor', label: 'Languages' },
      { href: '/learn', label: 'Learn' },
      { href: '/exams', label: 'Exams' },
      { href: '/exam-prep', label: 'Exam Prep' },
      { href: '/labs', label: 'Labs' },
      { href: '/workspace', label: 'Workspace' },
      { href: '/career', label: 'Career' },
      { href: '/interview', label: 'Interview' },
      { href: '/portfolio', label: 'Portfolio' },
    ],
    teacher: [
      { href: '/teacher', label: 'Dashboard' },
      { href: '/twin', label: 'AI Twin' },
      { href: '/companion', label: 'Companion' },
      { href: '/bookings', label: 'Sessions' },
      { href: '/earnings', label: 'Earnings' },
    ],
    parent: [{ href: '/children', label: 'My children' }],
    school_admin: [{ href: '/admin', label: 'Admin' }, { href: '/school', label: 'School' }],
    super_admin: [{ href: '/admin', label: 'Admin' }, { href: '/school', label: 'School' }],
  };
  const links = [...(role ? byRole[role] ?? [] : []), ...common];

  return (
    <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/80 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/home" className="text-xl font-extrabold text-brand">Learnova</Link>
        <div className="flex items-center gap-5 text-sm">
          {links.map((l) => <Link key={l.href} href={l.href}>{l.label}</Link>)}
          {me && <button onClick={logout} className="text-gray-400 hover:text-gray-700">Sign out</button>}
        </div>
      </nav>
    </header>
  );
}
