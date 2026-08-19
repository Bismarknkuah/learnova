import Link from 'next/link';
import { UpcomingClasses } from '@/components/UpcomingClasses';
import {
  Bot, Video, Search, FlaskConical, GraduationCap, ShieldCheck, Award, Languages,
  Briefcase, TrendingUp, Compass, FlaskRound, ArrowRight, ChevronRight, Search as SearchIcon,
  Sparkles, Calendar, BookOpen, Users2, Facebook, Twitter, Youtube, Instagram, Linkedin, Phone, Mail, MapPin,
} from 'lucide-react';

const QUICK = [
  { icon: Search, title: 'Find a Tutor', desc: 'Vetted tutors by subject & budget', href: '/register' },
  { icon: Video, title: 'Live Classes', desc: 'HD classrooms, labs & lectures', href: '/register' },
  { icon: GraduationCap, title: 'Exam Prep', desc: 'BECE · WASSCE · SAT · IELTS', href: '/register' },
  { icon: Award, title: 'Scholarships', desc: 'KG to postgrad, local & abroad', href: '/register' },
];

const FEATURES = [
  { icon: Bot, title: 'AI Tutor & Teacher Twins', desc: 'A 24/7 AI trained on each teacher’s style.' },
  { icon: Video, title: 'Live HD Classrooms', desc: 'Video, whiteboard, polls, quizzes, breakouts.' },
  { icon: FlaskConical, title: 'Virtual Laboratories', desc: 'Physics, electronics & logic labs in-browser.' },
  { icon: ShieldCheck, title: 'Proctored Exams', desc: 'AI proctoring for exam integrity.' },
  { icon: Compass, title: 'AI Career Mentor', desc: 'Interests mapped to careers & universities.' },
  { icon: FlaskRound, title: 'Research Assistant', desc: 'Literature reviews, citations, summaries.' },
  { icon: Languages, title: 'Language Tutor', desc: 'Twi, Fante, Ga, Ewe, Hausa, French & more.' },
  { icon: Briefcase, title: 'Portfolio & CV Builder', desc: 'Auto-build CVs and statements.' },
  { icon: TrendingUp, title: 'Adaptive Learning', desc: 'Targets your weakest topics first.' },
];

const ROLES = [
  { title: 'For Students', color: 'bg-brand', points: ['AI tutors 24/7', 'Live classes & labs', 'Exam prep', 'Verifiable portfolio'] },
  { title: 'For Teachers', color: 'bg-gold-dark', points: ['Keep 82% earnings', 'Your own AI Twin', 'Run live classrooms', 'No subscription'] },
  { title: 'For Parents', color: 'bg-coral', points: ['Track grades', 'Pay fees by MoMo', 'At-risk alerts', 'Find tutors'] },
  { title: 'For Schools', color: 'bg-ink', points: ['School management', 'Branded portal', 'Analytics', 'Bulk accounts'] },
];

const UPDATES = [
  { date: 'Jul 01, 2026', title: 'Multi-provider AI connector — plug in Claude, GPT or DeepSeek', tag: 'Product' },
  { date: 'Jun 28, 2026', title: 'Scholarships now span KG to postgraduate, local & abroad', tag: 'Scholarships' },
  { date: 'Jun 24, 2026', title: 'Teachers earn ₵0.20 per task teaching the inbuilt AI', tag: 'Teachers' },
  { date: 'Jun 20, 2026', title: 'Level-aware dashboards from KG to PhD', tag: 'Learning' },
];

const EVENTS = [
  { d: '02', m: 'Jul', title: 'Live WASSCE Physics Revision', venue: 'Live Classroom · Free' },
  { d: '05', m: 'Jul', title: 'BECE Maths Clinic: Quadratics', venue: 'Live Classroom' },
  { d: '12', m: 'Jul', title: 'Careers Webinar: Studying Abroad', venue: 'Live Classroom · Free' },
];

const FEATURED_LINKS = ['Scholarship Marketplace', 'Exam Prep Tracks', 'Tutor Marketplace', 'Virtual Laboratories', 'AI Career Mentor', 'Digital Library'];

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-ink">
      {/* Top utility bar */}
      <div className="bg-ink text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-2 text-sm">
          <nav className="hidden gap-5 sm:flex">
            <Link href="/register" className="text-white/80 hover:text-white">For Students</Link>
            <Link href="/register" className="text-white/80 hover:text-white">For Teachers</Link>
            <Link href="/register" className="text-white/80 hover:text-white">For Parents</Link>
            <Link href="/register" className="text-white/80 hover:text-white">For Schools</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/register" className="rounded-md border border-gold/60 px-3 py-1 text-xs font-semibold text-gold">GET STARTED</Link>
            <SearchIcon className="h-4 w-4 text-white/70" />
          </div>
        </div>
      </div>

      {/* Main nav */}
      <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand-dark text-sm font-black text-white">L</span>
            <div className="leading-tight"><span className="text-lg font-extrabold tracking-tight">Learnova</span><p className="text-[10px] uppercase tracking-wide text-ink-soft">Learn boldly. Rise together.</p></div>
          </div>
          <nav className="hidden items-center gap-6 text-sm font-medium text-ink lg:flex">
            <a href="#features" className="hover:text-brand">Features</a>
            <a href="#updates" className="hover:text-brand">News</a>
            <a href="#events" className="hover:text-brand">Live Classes</a>
            <a href="#roles" className="hover:text-brand">Who it’s for</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded-xl px-4 py-2 text-sm font-semibold text-ink-soft hover:text-brand">Sign in</Link>
            <Link href="/register" className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark">Get started</Link>
          </div>
        </div>
      </header>

      {/* Hero — full-bleed image banner */}
      <section className="relative">
        <img src="/home-bg.jpg" alt="" className="h-[62vh] min-h-[420px] w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/90 via-ink/70 to-ink/30" />
        <div className="absolute inset-0 flex items-center">
          <div className="mx-auto w-full max-w-6xl px-5">
            <div className="max-w-2xl text-white">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-sm font-medium backdrop-blur"><Sparkles className="h-3.5 w-3.5 text-gold" /> Africa’s AI-powered learning super-platform</span>
              <h1 className="mt-4 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">Everything you need to <span className="text-gold">learn, teach &amp; grow</span></h1>
              <p className="mt-4 max-w-xl text-lg text-white/85">AI tutors, live classrooms, virtual labs, exam prep, a tutor marketplace, scholarships and verifiable certificates — built for Ghana &amp; West Africa.</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/register" className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-7 py-3.5 font-semibold text-white shadow-lg transition hover:bg-brand-dark">Start free <ArrowRight className="h-4 w-4" /></Link>
                <Link href="/login" className="rounded-xl border border-white/40 bg-white/10 px-7 py-3.5 font-semibold text-white backdrop-blur transition hover:bg-white/20">Sign in</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick access cards overlapping hero */}
      <section className="mx-auto -mt-12 max-w-6xl px-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK.map((q) => (
            <Link key={q.title} href={q.href} className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-lift transition hover:-translate-y-1 hover:border-brand/30">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-soft text-brand transition group-hover:bg-brand group-hover:text-white"><q.icon className="h-5 w-5" /></span>
              <h3 className="mt-3 font-bold">{q.title}</h3>
              <p className="text-sm text-ink-soft">{q.desc}</p>
              <span className="mt-2 inline-flex items-center text-sm font-semibold text-brand">Explore <ChevronRight className="h-4 w-4" /></span>
            </Link>
          ))}
        </div>
      </section>

      {/* Latest from Learnova (news style) */}
      <section id="updates" className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Latest from Learnova</h2>
            <div className="mt-4 overflow-hidden rounded-2xl border border-gray-100">
              <img src="/login-bg.jpg" alt="" className="h-64 w-full object-cover" />
              <div className="p-5">
                <span className="rounded-md bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand">Featured</span>
                <h3 className="mt-2 text-lg font-bold">One platform for AI tutoring, live classes and exam success</h3>
                <p className="mt-1 text-sm text-ink-soft">From KG picture lessons to PhD research tools — a level-aware experience for every learner in West Africa, with pluggable frontier AI.</p>
              </div>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between"><h2 className="text-2xl font-bold tracking-tight">Updates</h2><Link href="/register" className="inline-flex items-center gap-1 text-sm font-semibold text-brand">More <ArrowRight className="h-4 w-4" /></Link></div>
            <ul className="mt-4 divide-y divide-gray-100">
              {UPDATES.map((u) => (
                <li key={u.title} className="py-4">
                  <span className="rounded-md bg-gold-soft px-2 py-0.5 text-[11px] font-semibold text-gold-dark">{u.tag}</span>
                  <p className="mt-1.5 font-semibold text-ink">{u.title}</p>
                  <p className="text-xs text-ink-soft">{u.date}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Mission band */}
      <section className="relative">
        <img src="/home-bg.jpg" alt="" className="h-72 w-full object-cover" />
        <div className="absolute inset-0 bg-brand/85" />
        <div className="absolute inset-0 flex flex-col items-center justify-center px-5 text-center text-white">
          <h2 className="max-w-2xl text-2xl font-extrabold sm:text-3xl">Built for every learner in West Africa — from the village to the university</h2>
          <p className="mt-2 max-w-xl text-white/85">Level-aware learning, local languages, mobile-money payments and scholarships that reach everyone.</p>
          <Link href="/register" className="mt-6 rounded-xl bg-white px-7 py-3 font-semibold text-brand transition hover:bg-gold-soft">Join Learnova free</Link>
        </div>
      </section>

      {/* Live classes & events */}
      <section id="events" className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <div className="flex items-center justify-between"><h2 className="text-2xl font-bold tracking-tight">Upcoming live classes</h2><Link href="/register" className="text-sm font-semibold text-brand">View all →</Link></div>
            <UpcomingClasses />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Featured</h2>
            <div className="mt-4 overflow-hidden rounded-2xl border border-gray-100">
              {FEATURED_LINKS.map((l) => (
                <Link key={l} href="/register" className="flex items-center justify-between border-b border-gray-100 px-5 py-4 transition last:border-0 hover:bg-brand-soft/40">
                  <span className="font-medium text-ink">{l}</span><ChevronRight className="h-5 w-5 text-brand" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section id="features" className="bg-gray-50/70 py-16">
        <div className="mx-auto max-w-6xl px-5">
          <div className="text-center"><h2 className="text-3xl font-bold tracking-tight">One platform. Every tool.</h2><p className="mx-auto mt-2 max-w-2xl text-ink-soft">A complete learning ecosystem — not just labs and exam prep.</p></div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="group rounded-2xl border border-gray-100 bg-white p-5 transition hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-lg">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-soft text-brand transition group-hover:bg-brand group-hover:text-white"><f.icon className="h-5 w-5" /></span>
                <h3 className="mt-3 font-bold">{f.title}</h3>
                <p className="mt-1 text-sm text-ink-soft">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section id="roles" className="mx-auto max-w-6xl px-5 py-16">
        <div className="text-center"><h2 className="text-3xl font-bold tracking-tight">Built for everyone in education</h2></div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ROLES.map((r) => (
            <div key={r.title} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-card">
              <span className={`inline-block rounded-lg ${r.color} px-3 py-1 text-sm font-semibold text-white`}>{r.title}</span>
              <ul className="mt-3 space-y-2">{r.points.map((p) => <li key={p} className="flex items-start gap-2 text-sm text-ink-soft"><ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> {p}</li>)}</ul>
            </div>
          ))}
        </div>
      </section>

      {/* Welcome band */}
      <section className="relative">
        <img src="/login-bg.jpg" alt="" className="h-80 w-full object-cover" />
        <div className="absolute inset-0 bg-ink/70" />
        <div className="absolute inset-0 flex flex-col items-center justify-center px-5 text-center text-white">
          <p className="max-w-2xl text-xl font-medium sm:text-2xl">“We invite you to be part of our vibrant learning community. A warm welcome awaits you as you discover and harness your full potential.”</p>
          <Link href="/register" className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-brand px-7 py-3 font-semibold text-white">Create your free account <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-ink text-white/80">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2 text-white"><span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-sm font-black">L</span><span className="text-lg font-extrabold">Learnova</span></div>
            <p className="mt-3 inline-flex items-center gap-2 text-sm"><Phone className="h-4 w-4" /> +233 24 071 5156</p>
            <p className="mt-1 inline-flex items-center gap-2 text-sm"><Mail className="h-4 w-4" /> hello@learnova.africa</p>
            <p className="mt-1 inline-flex items-center gap-2 text-sm"><MapPin className="h-4 w-4" /> Accra · Kumasi, Ghana</p>
            <div className="mt-4 flex gap-3">{[Facebook, Twitter, Youtube, Instagram, Linkedin].map((I, i) => <a key={i} href="#" className="text-white/60 hover:text-white"><I className="h-5 w-5" /></a>)}</div>
          </div>
          <div><h4 className="font-bold text-gold">LEARN</h4><ul className="mt-3 space-y-2 text-sm">{['Find a Tutor', 'Live Classes', 'Exam Prep', 'Virtual Labs', 'Digital Library'].map((x) => <li key={x}><Link href="/register" className="hover:text-white">{x}</Link></li>)}</ul></div>
          <div><h4 className="font-bold text-gold">FOR EDUCATORS</h4><ul className="mt-3 space-y-2 text-sm">{['Teach on Learnova', 'AI Twin', 'Earnings', 'Post Scholarships', 'For Schools'].map((x) => <li key={x}><Link href="/register" className="hover:text-white">{x}</Link></li>)}</ul></div>
          <div><h4 className="font-bold text-gold">COMPANY</h4><ul className="mt-3 space-y-2 text-sm">{['About', 'Scholarships', 'Careers', 'Contact', 'Sign in'].map((x) => <li key={x}><Link href={x === 'Sign in' ? '/login' : '/register'} className="hover:text-white">{x}</Link></li>)}</ul></div>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-5 py-5 text-sm sm:flex-row">
            <p>© {new Date().getFullYear()} Learnova. All rights reserved.</p>
            <p>Designed by <span className="font-semibold text-white">Desward Technologies</span></p>
          </div>
        </div>
      </footer>
    </main>
  );
}
