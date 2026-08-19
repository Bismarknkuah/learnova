'use client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';
import { endpoints, type RecommendationDto, type MasteryDto } from '@learnova/shared';

export default function StudyPlanPage() {
  const token = useAuth((s) => s.accessToken);
  const recs = useQuery({
    queryKey: ['recommendations'],
    queryFn: () => api.get<RecommendationDto[]>(endpoints.adaptive.recommendations, token ?? undefined),
    enabled: !!token,
  });
  const mastery = useQuery({
    queryKey: ['mastery'],
    queryFn: () => api.get<MasteryDto[]>(endpoints.adaptive.mastery, token ?? undefined),
    enabled: !!token,
  });

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <h1 className="mb-4 text-2xl font-bold">Your study plan</h1>
        <div className="space-y-3">
          {recs.data?.map((r) => (
            <Card key={r.concept}>
              <div className="flex items-center justify-between">
                <span className="font-medium">{r.concept}</span>
                <span className="rounded bg-brand/10 px-2 py-0.5 text-xs text-brand">{r.action.replace('_', ' ')}</span>
              </div>
              <p className="mt-1 text-sm text-gray-600">{r.reason}</p>
              <div className="mt-2 h-2 rounded bg-gray-100">
                <div className="h-2 rounded bg-brand" style={{ width: `${Math.round(r.mastery * 100)}%` }} />
              </div>
            </Card>
          ))}
          {!recs.data?.length && <p className="text-gray-500">Take a quiz or exam to build your plan.</p>}
        </div>
      </div>
      <div>
        <h2 className="mb-4 text-xl font-semibold">Mastery by concept</h2>
        <div className="space-y-2">
          {mastery.data?.map((m) => (
            <div key={m.concept} className="flex items-center gap-3">
              <span className="w-40 truncate text-sm">{m.concept}</span>
              <div className="h-2 flex-1 rounded bg-gray-100">
                <div className="h-2 rounded bg-emerald-500" style={{ width: `${Math.round(m.pKnown * 100)}%` }} />
              </div>
              <span className="w-10 text-right text-xs text-gray-500">{Math.round(m.pKnown * 100)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
