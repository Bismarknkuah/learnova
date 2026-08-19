'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, BookOpen, ClipboardCheck, Users, ArrowRight, type LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';

interface Mastery { concept: string; subject: string; pKnown: number; attempts: number; mastered: boolean }
interface NextAct { concept: string; subject: string; pKnown: number; action: string; reason: string }

const ACTION: Record<string, { label: string; href: string; icon: LucideIcon }> = {
  book_tutor: { label: 'Book a tutor', href: '/tutors', icon: Users },
  practice_quiz: { label: 'Practice a quiz', href: '/exams', icon: ClipboardCheck },
  revise_notes: { label: 'Revise notes', href: '/library', icon: BookOpen },
};

export default function LearnPage() {
  const token = useAuth((s) => s.accessToken) ?? undefined;
  const { data: mastery } = useQuery({ queryKey: ['mastery'], queryFn: () => api.get<Mastery[]>('/adaptive/mastery', token), enabled: !!token });
  const { data: next } = useQuery({ queryKey: ['next'], queryFn: () => api.get<NextAct[]>('/adaptive/next', token), enabled: !!token });

  const bar = (p: number) => p >= 0.85 ? 'bg-brand' : p >= 0.6 ? 'bg-gold' : 'bg-coral';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="inline-flex items-center gap-2 text-2xl font-bold text-ink"><TrendingUp className="h-6 w-6 text-brand" /> Your learning path</h1>
        <p className="text-ink-soft">The adaptive engine tracks your mastery and recommends what to do next.</p>
      </div>

      {/* Recommended next actions */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-ink">Recommended for you next</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {next?.map((n, i) => {
            const a = ACTION[n.action] ?? ACTION.revise_notes;
            return (
              <Card key={i}>
                <span className="text-xs uppercase tracking-wide text-gray-400">{n.subject}</span>
                <h3 className="mt-1 font-bold text-ink">{n.concept}</h3>
                <p className="mt-1 text-sm text-ink-soft">{n.reason}</p>
                <Link href={a.href} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand">
                  <a.icon className="h-4 w-4" /> {a.label} <ArrowRight className="h-4 w-4" />
                </Link>
              </Card>
            );
          })}
          {!next?.length && <p className="text-ink-soft">As you take quizzes and sessions, personalised recommendations appear here.</p>}
        </div>
      </section>

      {/* Mastery / weaknesses */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-ink">Your mastery (weakest first)</h2>
        <Card className="space-y-3">
          {mastery?.map((m, i) => (
            <div key={i}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium text-ink">{m.concept} <span className="text-ink-soft">· {m.subject}</span></span>
                <span className="text-ink-soft">{Math.round(m.pKnown * 100)}%{m.mastered ? ' ✓' : ''}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div className={`h-full ${bar(m.pKnown)}`} style={{ width: `${Math.round(m.pKnown * 100)}%` }} />
              </div>
            </div>
          ))}
          {!mastery?.length && <p className="text-ink-soft">No mastery data yet — take a quiz or a session to start building your map.</p>}
        </Card>
      </section>
    </div>
  );
}
