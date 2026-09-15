'use client';
import { useEffect, useState } from 'react';
import { SlidersHorizontal, Save, Bot } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';
import { useMe } from '@/features/profile/useMe';

const ROLES = ['student', 'teacher', 'parent', 'school_admin'] as const;
// Feature href → label. Admin toggles visibility per role.
const FEATURES: { href: string; label: string }[] = [
  { href: '/tutors', label: 'Tutor Marketplace' },
  { href: '/classroom', label: 'Live Classes' },
  { href: '/library', label: 'Digital Library' },
  { href: '/exams', label: 'Exams' },
  { href: '/assignments', label: 'Assignments' },
  { href: '/labs', label: 'Virtual Labs' },
  { href: '/exam-prep', label: 'Exam Prep' },
  { href: '/scholarships', label: 'Scholarships' },
  { href: '/career', label: 'Career Mentor' },
  { href: '/research', label: 'Research Hub' },
  { href: '/research-assistant', label: 'Research Assistant' },
  { href: '/language-tutor', label: 'Language Tutor' },
  { href: '/companion', label: 'AI Companion' },
  { href: '/twin', label: 'AI Twin' },
  { href: '/train-ai', label: 'Train AI (earn)' },
  { href: '/feed', label: 'Community Feed' },
  { href: '/messages', label: 'Messages' },
  { href: '/requests', label: 'Tutor Requests' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/portfolio', label: 'Portfolio' },
];

export default function SystemSettings() {
  const token = useAuth((s) => s.accessToken) ?? undefined;
  const { data: me } = useMe();
  const [disabled, setDisabled] = useState<Record<string, string[]>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => { api.get<{ disabled: Record<string, string[]> }>('/settings/features', token).then((r) => setDisabled(r.disabled ?? {})).catch(() => {}); }, [token]);

  if (me && me.role !== 'super_admin') return <p className="text-ink-soft">Only the super admin can manage system settings.</p>;

  const isOn = (role: string, href: string) => !(disabled[role] ?? []).includes(href);
  const toggle = (role: string, href: string) => {
    const list = new Set(disabled[role] ?? []);
    if (list.has(href)) list.delete(href); else list.add(href);
    setDisabled({ ...disabled, [role]: [...list] });
  };
  const save = async () => { await api.patch('/settings/features', { disabled }, token); setSaved(true); setTimeout(() => setSaved(false), 2500); };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="inline-flex items-center gap-2 text-2xl font-bold text-ink"><SlidersHorizontal className="h-6 w-6 text-brand" /> System settings</h1>
        <p className="text-sm text-ink-soft">Control which features each user type can see. Turn a feature off for a role and it disappears from their menu.</p>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left">
              <th className="py-2 pr-4 font-semibold text-ink">Feature</th>
              {ROLES.map((r) => <th key={r} className="px-3 py-2 text-center font-semibold capitalize text-ink">{r.replace('_', ' ')}</th>)}
            </tr>
          </thead>
          <tbody>
            {FEATURES.map((f) => (
              <tr key={f.href} className="border-b border-gray-50">
                <td className="py-2.5 pr-4 font-medium text-ink">{f.label}</td>
                {ROLES.map((r) => (
                  <td key={r} className="px-3 py-2.5 text-center">
                    <button onClick={() => toggle(r, f.href)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${isOn(r, f.href) ? 'bg-brand' : 'bg-gray-300'}`} aria-label={`${f.label} for ${r}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${isOn(r, f.href) ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <button onClick={save} className="inline-flex items-center gap-1 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white"><Save className="h-4 w-4" /> {saved ? 'Saved ✓' : 'Save settings'}</button>

      <Card className="flex items-start gap-3 bg-violet-50/60">
        <Bot className="mt-0.5 h-5 w-5 shrink-0 text-violet-600" />
        <p className="text-sm text-ink-soft">AI features (Companion, Twin, chatbot, CV writer, essay grading, language tutor) run on the provider set in <span className="font-semibold text-ink">Settings → AI Provider</span>. Connect your Anthropic key there to switch the whole platform to full Claude quality.</p>
      </Card>
    </div>
  );
}
