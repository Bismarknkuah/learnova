import { BaseAgent, type AgentTask } from './BaseAgent.js';
import type { DomainEvent } from '../core/eventBus.js';
import { llm } from '../ai/llm.js';
import { SessionModel } from '../modules/classrooms/session.model.js';
import { asr } from '../ai/asr.js';

/**
 * AI Class Assistant. When a live session ends, builds the study artifacts:
 * transcript → summary → key points → chapter markers → unanswered questions.
 * Transcription is stubbed (wire Whisper/Deepgram on the recording); the rest is real LLM work.
 */
export class ClassAssistantAgent extends BaseAgent {
  constructor() { super('ClassAssistantAgent', ['class_assist', 'summarize_session']); }

  reactions() {
    return { 'session.ended': (e: DomainEvent) => this.onSessionEnded(e) };
  }

  private async onSessionEnded(e: DomainEvent) {
    const { sessionId } = e.payload as { sessionId: string };
    const session = await SessionModel.findById(sessionId);
    if (!session) return;

    // Transcribe the recording via ASR (real audio → text). Falls back to a dev transcript.
    let transcript = session.transcript?.text ?? '';
    if (!transcript) {
      const result = await asr.transcribe(session.recording?.url ?? '');
      transcript = result.text;
      session.transcript = { url: session.recording?.url, text: transcript };
    }

    const result = await this.handle({ input: { title: session.title ?? 'Session', transcript } });

    session.aiSummary = result.summary;
    session.keyPoints = result.keyPoints;
    session.chapters = result.chapters as never;
    session.unansweredQuestions = result.unansweredQuestions;
    if (session.recording) session.recording.status = 'ready';
    await session.save();

    await this.emit('session.notes.ready', { sessionId, summary: result.summary }, e.meta);
  }

  async handle(task: AgentTask<{ title: string; transcript: string }>): Promise<{
    summary: string; keyPoints: string[]; chapters: { title: string; atMs: number }[]; unansweredQuestions: string[];
  }> {
    const { title, transcript } = task.input;
    const raw = await llm.complete({
      system: `You are a class assistant. From a lesson transcript, return ONLY JSON: ` +
        `{"summary":"3-5 sentences","keyPoints":["..."],"chapters":[{"title":"...","atMs":0}],` +
        `"unansweredQuestions":["..."]}. No prose.`,
      messages: [{ role: 'user', content: `Title: ${title}\nTranscript:\n${transcript}` }],
      maxTokens: 700,
    });
    try {
      return JSON.parse(raw.replace(/```json|```/g, '').trim());
    } catch {
      return { summary: `Summary of ${title}.`, keyPoints: [], chapters: [], unansweredQuestions: [] };
    }
  }
}
