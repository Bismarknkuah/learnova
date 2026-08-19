import { llm } from './llm.js';
import { logger } from '../core/logger.js';

interface Doc { id: string; text: string; vector: number[]; meta: Record<string, unknown> }
const namespaces = new Map<string, Doc[]>();
const cosine = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0);

function chunk(text: string, size = 600, overlap = 100): string[] {
  const words = text.split(/\s+/);
  const out: string[] = [];
  for (let i = 0; i < words.length; i += size - overlap) {
    out.push(words.slice(i, i + size).join(' '));
    if (i + size >= words.length) break;
  }
  return out.length ? out : [text];
}

/** Per-teacher isolated vector store powering each AI Twin. Swap for Qdrant in prod. */
export const ragStore = {
  async ingest(namespace: string, text: string, meta: Record<string, unknown> = {}) {
    const store = namespaces.get(namespace) ?? [];
    const pieces = chunk(text);
    for (const piece of pieces) {
      store.push({ id: 'd_' + Math.random().toString(36).slice(2, 10), text: piece, vector: await llm.embed(piece), meta });
    }
    namespaces.set(namespace, store);
    logger.info({ namespace, chunks: pieces.length }, 'rag.ingest');
    return pieces.length;
  },
  async retrieve(namespace: string, query: string, k = 4) {
    const store = namespaces.get(namespace) ?? [];
    if (!store.length) return [];
    const qv = await llm.embed(query);
    return store.map((d) => ({ ...d, score: cosine(qv, d.vector) }))
      .sort((a, b) => b.score - a.score).slice(0, k);
  },
  async clear(namespace: string) { namespaces.delete(namespace); },
};
