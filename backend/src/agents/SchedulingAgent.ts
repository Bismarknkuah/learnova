import { BaseAgent, type AgentTask } from './BaseAgent.js';

interface Window { start: number; end: number }
interface Input { teacherAvail: Window[]; studentAvail: Window[]; existingBookings?: Window[]; durationMin?: number }

/** Conflict-free, timezone-aware slot finder (interval intersection; upgrade to a CSP later). */
export class SchedulingAgent extends BaseAgent {
  constructor() { super('SchedulingAgent', ['scheduling']); }

  async handle(task: AgentTask<Input>) {
    const { teacherAvail, studentAvail, existingBookings = [], durationMin = 60 } = task.input;
    const free = this.intersect(teacherAvail ?? [], studentAvail ?? []);
    const slots: Window[] = [];
    const ms = durationMin * 60_000;
    for (const w of free) {
      for (let c = w.start; c + ms <= w.end; c += ms) {
        const slot = { start: c, end: c + ms };
        if (!existingBookings.some((b) => slot.start < b.end && b.start < slot.end)) slots.push(slot);
      }
    }
    return { slots: slots.slice(0, 20) };
  }
  private intersect(a: Window[], b: Window[]): Window[] {
    const out: Window[] = [];
    for (const x of a) for (const y of b) {
      const start = Math.max(x.start, y.start), end = Math.min(x.end, y.end);
      if (start < end) out.push({ start, end });
    }
    return out;
  }
}
