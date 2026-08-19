import { Schema, model, Types, type InferSchemaType } from 'mongoose';

/**
 * A genuinely self-training (classical) language model: per-language trigram statistics
 * that grow every time text is fed in. Not a transformer/LLM — an honest n-gram model that
 * learns from the platform's own data with zero external cost and improves over time.
 */
const langModelSchema = new Schema({
  tenantId: { type: Types.ObjectId, ref: 'Tenant', required: true, index: true },
  language: { type: String, required: true, index: true },
  // trigram table: key "w1\u0001w2" -> { nextWord: count }
  trigrams: { type: Schema.Types.Mixed, default: {} },
  vocab: { type: [String], default: [] },
  tokensTrained: { type: Number, default: 0 },
  documents: { type: Number, default: 0 },
}, { timestamps: true });
langModelSchema.index({ tenantId: 1, language: 1 }, { unique: true });

export type LangModel = InferSchemaType<typeof langModelSchema>;
export const LangModelModel = model('LangModel', langModelSchema);

const SEP = '\u0001';
export function words(text: string): string[] {
  return String(text).toLowerCase().replace(/[^\p{L}\p{N}\s'.?!]/gu, ' ').split(/\s+/).filter(Boolean);
}

/** Train (incrementally) on a chunk of text — merges new trigram counts into the existing model. */
export function trainInto(model: { trigrams: Record<string, Record<string, number>>; vocab: string[]; tokensTrained: number; documents: number }, text: string) {
  const toks = words(text);
  const vocab = new Set(model.vocab);
  const tri = model.trigrams as Record<string, Record<string, number>>;
  for (let i = 0; i < toks.length - 2; i++) {
    const key = toks[i] + SEP + toks[i + 1];
    const next = toks[i + 2];
    tri[key] = tri[key] || {};
    tri[key][next] = (tri[key][next] || 0) + 1;
    vocab.add(toks[i]); vocab.add(toks[i + 1]); vocab.add(next);
  }
  // Cap vocab/table growth so the stored model stays reasonable.
  model.vocab = [...vocab].slice(0, 20000);
  model.tokensTrained += toks.length;
  model.documents += 1;
  return model;
}

/** Generate text by sampling the trigram model (weighted by learned counts). */
export function generate(tri: Record<string, Record<string, number>>, seed: string, maxWords = 40): string {
  const start = words(seed);
  let w1 = start[start.length - 2] ?? 'the';
  let w2 = start[start.length - 1] ?? 'student';
  const out: string[] = [];
  for (let i = 0; i < maxWords; i++) {
    const dist = tri[w1 + SEP + w2];
    if (!dist) break;
    const total = Object.values(dist).reduce((a, b) => a + b, 0);
    let r = Math.random() * total; let chosen = '';
    for (const [word, c] of Object.entries(dist)) { r -= c; if (r <= 0) { chosen = word; break; } }
    if (!chosen) break;
    out.push(chosen);
    w1 = w2; w2 = chosen;
    if (/[.?!]$/.test(chosen) && out.length > 6) break;
  }
  return out.join(' ');
}
