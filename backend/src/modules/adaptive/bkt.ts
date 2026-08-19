/**
 * Bayesian Knowledge Tracing (BKT).
 * Given the current probability a skill is known (pKnown) and an observation (correct/incorrect),
 * update the estimate. Standard 4-parameter model: pLearn, pSlip, pGuess (+ small pForget).
 *
 * This is a transparent, well-understood baseline; swap for Deep Knowledge Tracing later
 * behind the same `update()` signature.
 */
export interface BktParams { pLearn: number; pSlip: number; pGuess: number; pForget: number }

export const DEFAULT_BKT: BktParams = { pLearn: 0.15, pSlip: 0.1, pGuess: 0.2, pForget: 0.02 };

export function bktUpdate(pKnown: number, correct: boolean, p: BktParams = DEFAULT_BKT): number {
  // Posterior P(known | observation) via Bayes.
  const pObsIfKnown = correct ? 1 - p.pSlip : p.pSlip;
  const pObsIfUnknown = correct ? p.pGuess : 1 - p.pGuess;
  const numerator = pKnown * pObsIfKnown;
  const posterior = numerator / (numerator + (1 - pKnown) * pObsIfUnknown);
  // Account for learning during this opportunity (and a little forgetting).
  const learned = posterior + (1 - posterior) * p.pLearn;
  return Math.min(0.999, Math.max(0.001, learned * (1 - p.pForget)));
}
