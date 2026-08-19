import { BaseAgent, type AgentTask } from './BaseAgent.js';
import type { DomainEvent } from '../core/eventBus.js';
import { ragStore } from '../ai/ragStore.js';
import { llm } from '../ai/llm.js';

interface AskInput { question: string; twinId?: string; subject?: string; studentLevel?: string }

/** Powers the Personal AI Companion and each teacher's AI Twin (grounded, cited RAG). */
export class TutorAgent extends BaseAgent {
  constructor() { super('TutorAgent', ['teaching', 'qa', 'ai_twin', 'companion']); }

  reactions() {
    return {
      'teacher.lesson.uploaded': (e: DomainEvent) => this.onLesson(e),
      'student.question.asked': (e: DomainEvent) => this.onQuestion(e),
    };
  }

  private async onLesson(e: DomainEvent) {
    const { teacherId, text, source } = e.payload as { teacherId: string; text: string; source?: string };
    const n = await ragStore.ingest(`twin:${teacherId}`, text, { source, teacherId });
    await this.emit('ai_twin.updated', { teacherId, chunks: n }, e.meta);
  }

  private async onQuestion(e: DomainEvent) {
    const out = await this.handle({ input: e.payload as AskInput });
    await this.emit('tutor.answer.ready', out, e.meta);
  }

  async handle(task: AgentTask<AskInput>) {
    const { question, twinId, subject, studentLevel } = task.input;
    let grounding = '';
    let citations: { ref: number; source: unknown }[] = [];
    if (twinId) {
      const hits = await ragStore.retrieve(`twin:${twinId}`, question, 4);
      grounding = hits.map((h, i) => `[${i + 1}] ${h.text}`).join('\n\n');
      citations = hits.map((h, i) => ({ ref: i + 1, source: h.meta.source }));
    }
    const system = twinId
      ? `You are the AI Twin of a real teacher. Answer ONLY from the provided excerpts, in a warm teaching style, and cite as [n]. If uncovered, say so and suggest a live session.`
      : `You are a patient AI learning companion for a ${studentLevel ?? 'secondary'} student in West Africa. Explain ${subject ?? 'the topic'} simply with local examples.`;
    const user = grounding ? `Excerpts:\n${grounding}\n\nQuestion: ${question}` : `Question: ${question}`;
    const answer = await llm.complete({ system, messages: [{ role: 'user', content: user }], maxTokens: 800 });
    return { answer, citations, twinId: twinId ?? null };
  }
}
