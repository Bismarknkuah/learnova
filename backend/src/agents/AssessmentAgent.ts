import { BaseAgent, type AgentTask } from './BaseAgent.js';
import type { DomainEvent } from '../core/eventBus.js';
import { llm } from '../ai/llm.js';

interface ReviewInput { title: string; subject?: string; excerpt?: string }

/** Reviews submitted assignments: feedback, hints, a provisional score, plagiarism signal. */
export class AssessmentAgent extends BaseAgent {
  constructor() { super('AssessmentAgent', ['assess', 'grade', 'review_assignment']); }

  reactions() {
    return { 'assignment.submitted': (e: DomainEvent) => this.onSubmitted(e) };
  }

  private async onSubmitted(e: DomainEvent) {
    const { assignmentId } = e.payload as { assignmentId: string };
    // The service passes enough context on the event; agents stay stateless.
    const review = await this.handle({ input: (e.payload as { review?: ReviewInput }).review ?? { title: 'submission' } });
    await this.emit('assignment.reviewed', { assignmentId, review }, e.meta);
  }

  async handle(task: AgentTask<ReviewInput>) {
    const { title, subject, excerpt } = task.input;
    const raw = await llm.complete({
      system: `You are a fair teaching assistant. Review the student's work and return ONLY JSON: ` +
        `{"score":0-100,"feedback":"...","hints":["..."],"plagiarismScore":0-1}. No prose.`,
      messages: [{ role: 'user', content: `Subject: ${subject ?? 'general'}\nTitle: ${title}\nWork: ${excerpt ?? '(no text extracted)'}` }],
      maxTokens: 500,
    });
    try {
      return JSON.parse(raw.replace(/```json|```/g, '').trim());
    } catch {
      return { score: null, feedback: 'Auto-review pending.', hints: [], plagiarismScore: 0 };
    }
  }
}
