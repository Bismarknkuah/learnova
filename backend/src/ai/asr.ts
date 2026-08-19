import { config } from '../config/index.js';
import { logger } from '../core/logger.js';

export interface Transcript { text: string; segments?: { start: number; end: number; text: string }[] }

/**
 * Speech-to-text for class recordings. Provider-agnostic:
 *  - Deepgram (prerecorded) when DEEPGRAM_API_KEY is set
 *  - else a dev placeholder so the AI Class Assistant pipeline runs without a provider
 * Wire Whisper/AssemblyAI behind the same `transcribe()` signature as needed.
 */
async function deepgram(url: string): Promise<Transcript> {
  const res = await fetch('https://api.deepgram.com/v1/listen?punctuate=true&utterances=true', {
    method: 'POST',
    headers: { Authorization: `Token ${config.asr.deepgramApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw new Error(`ASR HTTP ${res.status}`);
  const data = (await res.json()) as {
    results?: { channels?: { alternatives?: { transcript?: string }[] }[]; utterances?: { start: number; end: number; transcript: string }[] };
  };
  const text = data.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? '';
  const segments = data.results?.utterances?.map((u) => ({ start: u.start, end: u.end, text: u.transcript }));
  return { text, segments };
}

const DEV_TRANSCRIPT =
  "Today we covered Newton's three laws of motion, worked two WASSCE past questions on force " +
  "and acceleration, and discussed inertia with a football example.";

export const asr = {
  async transcribe(recordingUrl: string): Promise<Transcript> {
    if (config.asr.provider === 'deepgram' && config.asr.deepgramApiKey && recordingUrl && !recordingUrl.startsWith('dev')) {
      try { return await deepgram(recordingUrl); }
      catch (err) { logger.error({ err: (err as Error).message }, 'asr failed, using placeholder'); }
    }
    logger.debug('asr: dev placeholder transcript');
    return { text: DEV_TRANSCRIPT };
  },
};
