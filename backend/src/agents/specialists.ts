import { BaseAgent, type AgentTask } from './BaseAgent.js';
import type { DomainEvent } from '../core/eventBus.js';

/**
 * Specialist agents completing the multi-agent roster. Each declares capabilities the Supervisor
 * can route to, and event reactions for the event-driven choreography between agents.
 */

/** Exam Agent — turns raw proctoring signals into an integrity verdict. */
export class ExamAgent extends BaseAgent {
  constructor() { super('ExamAgent', ['proctoring', 'exam_integrity']); }
  async handle(task: AgentTask): Promise<unknown> {
    const { events = [], riskScore = 0 } = task.input as { events?: { type: string }[]; riskScore?: number };
    const highSignals = events.filter((e) => ['multiple_faces', 'phone_detected', 'paste'].includes(e.type)).length;
    const verdict = riskScore >= 18 || highSignals >= 3 ? 'review' : riskScore >= 8 ? 'watch' : 'clean';
    return { verdict, riskScore, highSignals };
  }
  reactions(): Record<string, (e: DomainEvent) => void> {
    return { 'exam.submitted': (e) => { if ((e.payload as { riskScore?: number })?.riskScore ?? 0 >= 18) this.emit('fraud.suspected', e.payload, e.meta); } };
  }
}

/** Career Agent — interests/skills/strengths → career directions. */
export class CareerAgent extends BaseAgent {
  constructor() { super('CareerAgent', ['career_guidance']); }
  async handle(task: AgentTask): Promise<unknown> {
    const { interests = [], skills = [] } = task.input as { interests?: string[]; skills?: string[] };
    return { signalCount: interests.length + skills.length, note: 'Routed to career knowledge base.' };
  }
}

/** Fraud Agent — fuses plagiarism + proctoring into a cheating-risk verdict. */
export class FraudAgent extends BaseAgent {
  constructor() { super('FraudAgent', ['fraud_detection', 'cheating_detection']); }
  async handle(task: AgentTask): Promise<unknown> {
    const { plagiarism = 0, proctorRisk = 0 } = task.input as { plagiarism?: number; proctorRisk?: number };
    const score = Math.min(100, Math.round(plagiarism * 0.6 + proctorRisk * 2));
    return { fraudRisk: score, level: score >= 60 ? 'high' : score >= 30 ? 'medium' : 'low' };
  }
  reactions(): Record<string, (e: DomainEvent) => void> {
    return { 'fraud.suspected': (e) => this.log.warn({ payload: e.payload }, 'fraud.suspected received') };
  }
}

/** Analytics Agent — aggregates activity into report-ready metrics. */
export class AnalyticsAgent extends BaseAgent {
  constructor() { super('AnalyticsAgent', ['analytics', 'reports']); }
  async handle(task: AgentTask): Promise<unknown> {
    const m = task.input as Record<string, number>;
    const total = Object.values(m).reduce((a, b) => a + (Number(b) || 0), 0);
    return { metrics: m, total, generatedAt: new Date().toISOString() };
  }
}

/** School Agent — school-management operations summary. */
export class SchoolAgent extends BaseAgent {
  constructor() { super('SchoolAgent', ['school_management']); }
  async handle(task: AgentTask): Promise<unknown> { return { ok: true, scope: 'school', input: task.input }; }
}

/** Parent Agent — pushes notifications to guardians on key events. */
export class ParentAgent extends BaseAgent {
  constructor() { super('ParentAgent', ['parent_notifications']); }
  async handle(task: AgentTask): Promise<unknown> { return { notified: true, input: task.input }; }
  reactions(): Record<string, (e: DomainEvent) => void> {
    return {
      'result.posted': (e) => this.emit('parent.notify', { kind: 'result', ...(e.payload as object) }, e.meta),
      'fee.invoiced': (e) => this.emit('parent.notify', { kind: 'fee', ...(e.payload as object) }, e.meta),
    };
  }
}

/** Research Agent — research-collaboration assistance. */
export class ResearchAgent extends BaseAgent {
  constructor() { super('ResearchAgent', ['research_collaboration']); }
  async handle(task: AgentTask): Promise<unknown> { return { ok: true, scope: 'research', input: task.input }; }
}
