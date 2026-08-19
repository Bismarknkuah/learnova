import { llm } from '../../ai/llm.js';
import { config } from '../../config/index.js';

export interface GenQuestion { prompt: string; options: string[]; answerIndex: number; topic?: string; marks?: number }

/** Internal fallback question banks per national exam track (used when no AI key is set). */
const BANK: Record<string, GenQuestion[]> = {
  BECE: [
    { prompt: 'The capital of Ghana is…', options: ['Kumasi', 'Accra', 'Takoradi', 'Tamale'], answerIndex: 1, topic: 'social-studies' },
    { prompt: 'Which is a prime number?', options: ['9', '15', '17', '21'], answerIndex: 2, topic: 'maths' },
    { prompt: 'The process by which plants make food is…', options: ['Respiration', 'Photosynthesis', 'Digestion', 'Transpiration'], answerIndex: 1, topic: 'science' },
  ],
  WASSCE: [
    { prompt: 'The SI unit of electric current is the…', options: ['Volt', 'Ampere', 'Ohm', 'Watt'], answerIndex: 1, topic: 'physics' },
    { prompt: 'Solve: 2x + 6 = 0', options: ['x = 3', 'x = -3', 'x = 6', 'x = -6'], answerIndex: 1, topic: 'maths' },
    { prompt: 'A balanced chemical equation obeys the law of…', options: ['Conservation of mass', 'Gravity', 'Inertia', 'Reflection'], answerIndex: 0, topic: 'chemistry' },
  ],
  GRE: [
    { prompt: 'Choose the synonym of "ephemeral":', options: ['Permanent', 'Fleeting', 'Solid', 'Ancient'], answerIndex: 1, topic: 'verbal' },
    { prompt: 'If 3x = 12, then x² = ?', options: ['9', '12', '16', '4'], answerIndex: 2, topic: 'quant' },
  ],
  SAT: [
    { prompt: 'The value of 5! is…', options: ['25', '60', '120', '20'], answerIndex: 2, topic: 'math' },
    { prompt: 'Choose the correctly punctuated sentence:', options: ['Its raining.', 'It is raining.', 'Its raining', 'It raining.'], answerIndex: 1, topic: 'writing' },
  ],
  IELTS: [
    { prompt: 'Choose the best synonym for "significant":', options: ['Tiny', 'Important', 'Quiet', 'Late'], answerIndex: 1, topic: 'reading' },
    { prompt: 'Identify the grammatically correct option:', options: ['She do not likes it.', 'She does not likes it.', 'She does not like it.', 'She not like it.'], answerIndex: 2, topic: 'grammar' },
  ],
  TOEFL: [
    { prompt: 'Pick the word closest in meaning to "abundant":', options: ['Scarce', 'Plentiful', 'Empty', 'Narrow'], answerIndex: 1, topic: 'vocabulary' },
    { prompt: 'Choose the correct preposition: "interested ___ science".', options: ['on', 'at', 'in', 'of'], answerIndex: 2, topic: 'grammar' },
  ],
};

function sample<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  while (copy.length && out.length < n) out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  return out;
}

/** AI practice-exam generator. Uses the LLM when configured, otherwise an internal bank. */
export async function generatePracticeExam(track: string, subject: string | undefined, count: number): Promise<GenQuestion[]> {
  const bank = BANK[track] ?? BANK.WASSCE;

  if (config.ai.anthropicApiKey) {
    try {
      const raw = await llm.complete({
        system: `You are an exam author for the ${track} examination${subject ? ` (${subject})` : ''}. ` +
          `Return ONLY a JSON array of ${count} multiple-choice questions, each: ` +
          `{"prompt":"...","options":["a","b","c","d"],"answerIndex":0,"topic":"..."}. No prose.`,
        messages: [{ role: 'user', content: `Generate ${count} ${track} practice questions${subject ? ` for ${subject}` : ''}.` }],
        maxTokens: 1500,
      });
      const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim()) as GenQuestion[];
      if (Array.isArray(parsed) && parsed.length) return parsed.slice(0, count).map((q) => ({ ...q, marks: 1 }));
    } catch { /* fall back to bank */ }
  }
  // Internal fallback: sample (repeating if needed to reach count).
  const out: GenQuestion[] = [];
  while (out.length < count) out.push(...sample(bank, Math.min(count - out.length, bank.length)));
  return out.slice(0, count).map((q) => ({ ...q, marks: 1 }));
}
