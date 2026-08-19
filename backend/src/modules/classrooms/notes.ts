/**
 * Internal note generator — produces useful class notes from a transcript WITHOUT any external
 * AI. Uses extractive summarisation (word-frequency sentence scoring) plus pattern detection for
 * formulas, homework and open questions. When an LLM key is configured the caller can enrich this,
 * but it always works on its own.
 */
const STOP = new Set('the a an and or but of to in on at for with is are was were be been it this that these those as by from i you we they he she his her their our your my so if then than not no yes do does did can could will would should may might'.split(' '));

function sentences(text: string): string[] {
  return text.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.length > 12);
}

function topSentences(text: string, n: number): string[] {
  const sents = sentences(text);
  const freq = new Map<string, number>();
  for (const w of text.toLowerCase().match(/[a-z]+/g) ?? []) if (!STOP.has(w) && w.length > 2) freq.set(w, (freq.get(w) ?? 0) + 1);
  const scored = sents.map((s) => {
    const words = s.toLowerCase().match(/[a-z]+/g) ?? [];
    const score = words.reduce((a, w) => a + (freq.get(w) ?? 0), 0) / (words.length || 1);
    return { s, score };
  });
  return scored.sort((a, b) => b.score - a.score).slice(0, n).map((x) => x.s);
}

export interface ClassNotes {
  summary: string; keyPoints: string[]; formulas: string[];
  homework: string[]; unansweredQuestions: string[];
}

export function generateNotes(title: string, transcript: string): ClassNotes {
  const sents = sentences(transcript);
  const summary = topSentences(transcript, 3).join(' ') || `Notes for ${title}.`;
  const keyPoints = topSentences(transcript, 6);
  // Formulas: lines containing math operators / equations.
  const formulas = sents.filter((s) => /[=]/.test(s) && /[0-9x-z²³^+\-*/]/i.test(s)).slice(0, 6);
  // Homework: sentences mentioning assignment cues.
  const homework = sents.filter((s) => /\b(homework|assignment|due|submit|exercise|practice|read pages?)\b/i.test(s)).slice(0, 6);
  // Open questions: anything phrased as a question.
  const unansweredQuestions = sents.filter((s) => s.endsWith('?')).slice(0, 6);
  return { summary, keyPoints, formulas, homework, unansweredQuestions };
}
