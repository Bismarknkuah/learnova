import { BaseAgent, type AgentTask } from './BaseAgent.js';

interface Student { subject?: string; language?: string; level?: string; maxPrice?: number }
interface Cand {
  id: string; subjects?: string[]; languages?: string[]; hourlyRateGHS: number;
  rating?: number; completedSessions?: number; level?: string; availableNow?: boolean; availability?: unknown;
}

/** Hybrid tutor recommender: transparent content + quality scoring (swap parts for ML later). */
export class RecommendationAgent extends BaseAgent {
  constructor() { super('RecommendationAgent', ['recommend_tutors', 'recommend_content']); }

  async handle(task: AgentTask<{ student: Student; tutors: Cand[] }>) {
    const { student, tutors } = task.input;
    const recommended = tutors
      .map((t) => ({ tutor: t, score: this.score(student, t), why: this.why(student, t) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    return { recommended };
  }

  private score(s: Student, t: Cand): number {
    let v = 0;
    if (s.subject && t.subjects?.includes(s.subject)) v += 40;
    if (s.language && t.languages?.includes(s.language)) v += 15;
    if (s.maxPrice && t.hourlyRateGHS <= s.maxPrice) v += 15;
    if (s.level && t.level === s.level) v += 10;
    v += Math.min(t.rating ?? 0, 5) * 3;
    v += Math.min((t.completedSessions ?? 0) / 50, 1) * 5;
    if (t.availableNow) v += 5;
    return Math.round(v);
  }
  private why(s: Student, t: Cand): string[] {
    const r: string[] = [];
    if (s.subject && t.subjects?.includes(s.subject)) r.push(`teaches ${s.subject}`);
    if (s.language && t.languages?.includes(s.language)) r.push(`speaks ${s.language}`);
    if (s.maxPrice && t.hourlyRateGHS <= s.maxPrice) r.push(`within budget (₵${t.hourlyRateGHS}/hr)`);
    if ((t.rating ?? 0) >= 4.5) r.push(`highly rated (${t.rating}★)`);
    return r;
  }
}
