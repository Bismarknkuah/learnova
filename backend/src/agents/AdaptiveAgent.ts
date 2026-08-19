import { BaseAgent, type AgentTask } from './BaseAgent.js';
import type { DomainEvent } from '../core/eventBus.js';
import { adaptiveService, type ConceptOutcome } from '../modules/adaptive/adaptive.service.js';

/**
 * Adaptive Learning engine agent. Listens to learning signals (exam results, assignment
 * reviews) and updates each student's concept-mastery map via Bayesian Knowledge Tracing,
 * then surfaces the next best activity. Decoupled: other modules just emit events.
 */
export class AdaptiveAgent extends BaseAgent {
  constructor() { super('AdaptiveAgent', ['adaptive', 'knowledge_tracing', 'recommend_activity']); }

  reactions() {
    return {
      'exam.submitted': (e: DomainEvent) => this.onExam(e),
      'assignment.reviewed': (e: DomainEvent) => this.onAssignment(e),
    };
  }

  private async onExam(e: DomainEvent) {
    const { studentId, outcomes } = e.payload as { studentId?: string; outcomes?: ConceptOutcome[] };
    if (!e.meta.tenantId || !studentId || !outcomes?.length) return;
    await adaptiveService.recordOutcomes(e.meta.tenantId, studentId, outcomes);
    await this.emit('mastery.updated', { studentId, concepts: outcomes.length }, e.meta);
  }

  private async onAssignment(e: DomainEvent) {
    const p = e.payload as { studentId?: string; review?: { score?: number; concept?: string; subject?: string } };
    if (!e.meta.tenantId || !p.studentId || !p.review?.concept) return;
    await adaptiveService.recordOutcomes(e.meta.tenantId, p.studentId, [
      { concept: p.review.concept, subject: p.review.subject, correct: (p.review.score ?? 0) >= 60 },
    ]);
  }

  async handle(task: AgentTask<{ tenantId: string; studentId: string }>) {
    const { tenantId, studentId } = task.input;
    return adaptiveService.nextActivities(tenantId, studentId);
  }
}
