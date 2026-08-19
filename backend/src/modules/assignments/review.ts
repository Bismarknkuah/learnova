import { llm } from '../../ai/llm.js';
import { config } from '../../config/index.js';

/** Word-shingle set (n-grams) for similarity. */
function shingles(text: string, n = 4): Set<string> {
  const words = (text.toLowerCase().match(/[a-z0-9]+/g) ?? []);
  const out = new Set<string>();
  for (let i = 0; i + n <= words.length; i++) out.add(words.slice(i, i + n).join(' '));
  return out;
}
function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0; for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

/** Internal plagiarism: highest similarity of `text` against a corpus of prior submissions. */
export function plagiarismScore(text: string, corpus: { id: string; text: string }[]): { score: number; matchedId?: string } {
  const s = shingles(text);
  let best = 0, matchedId: string | undefined;
  for (const c of corpus) {
    const sim = jaccard(s, shingles(c.text));
    if (sim > best) { best = sim; matchedId = c.id; }
  }
  return { score: Math.round(best * 100), matchedId };
}

/** Heuristic feedback that works with no AI key (structure, length, repetition, readability). */
function heuristicFeedback(text: string): { feedback: string[]; hints: string[] } {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 3);
  const avgLen = words.length / (sentences.length || 1);
  const feedback: string[] = [];
  const hints: string[] = [];
  feedback.push(`Length: ${words.length} words across ${sentences.length} sentences.`);
  if (words.length < 120) hints.push('Develop your answer further — aim for more depth and examples.');
  if (avgLen > 28) hints.push('Some sentences are long; break them up for clarity.');
  if (!/[.!?]$/.test(text.trim())) feedback.push('Your submission doesn’t end with punctuation — check the ending.');
  const lower = text.toLowerCase();
  const dups = (lower.match(/\b(\w+)\s+\1\b/g) ?? []);
  if (dups.length) feedback.push(`Repeated words detected (e.g. "${dups[0]}").`);
  if (!/because|therefore|however|for example|as a result/.test(lower)) hints.push('Add linking words (because, therefore, for example) to strengthen reasoning.');
  return { feedback, hints };
}

export async function reviewSubmission(text: string, corpus: { id: string; text: string }[]) {
  const plagiarism = plagiarismScore(text, corpus);
  const base = heuristicFeedback(text);

  // Enrich with the LLM when a key is configured.
  if (config.ai.anthropicApiKey) {
    try {
      const raw = await llm.complete({
        system: 'You are a teacher reviewing a student submission. Return ONLY JSON: ' +
          '{"feedback":["..."],"hints":["..."],"corrections":["..."]}. Be specific and encouraging.',
        messages: [{ role: 'user', content: text.slice(0, 6000) }],
        maxTokens: 600,
      });
      const ai = JSON.parse(raw.replace(/```json|```/g, '').trim());
      return { plagiarism, feedback: ai.feedback ?? base.feedback, hints: ai.hints ?? base.hints, corrections: ai.corrections ?? [] };
    } catch { /* fall back */ }
  }
  return { plagiarism, feedback: base.feedback, hints: base.hints, corrections: [] };
}
