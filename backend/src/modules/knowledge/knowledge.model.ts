import { Schema, model, Types, type InferSchemaType } from 'mongoose';

/** The inbuilt assistant's growing knowledge base. Every Q&A taught, lesson fed,
 *  or library note added expands it — so the assistant improves over time with no external AI. */
const knowledgeSchema = new Schema({
  tenantId: { type: Types.ObjectId, ref: 'Tenant', required: true, index: true },
  question: { type: String, required: true },
  answer: { type: String, required: true },
  subject: String,
  source: { type: String, default: 'taught' },   // taught | lesson | library | system
  keywords: { type: [String], default: [], index: true },
  hits: { type: Number, default: 0 },             // how often it has helped (popularity)
  addedBy: { type: Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export type Knowledge = InferSchemaType<typeof knowledgeSchema>;
export const KnowledgeModel = model('Knowledge', knowledgeSchema);

const STOP = new Set(['the', 'a', 'an', 'is', 'are', 'of', 'to', 'in', 'on', 'and', 'or', 'what', 'how', 'why', 'who', 'when', 'do', 'does', 'i', 'my', 'me', 'for', 'with', 'this', 'that', 'it']);
export function tokenize(text: string): string[] {
  return [...new Set(String(text).toLowerCase().split(/\W+/).filter((w) => w.length > 2 && !STOP.has(w)))];
}

/** Retrieve the best-matching knowledge entry by keyword overlap (Jaccard-ish). Pure internal — no external calls. */
export async function recall(tenantId: string, query: string) {
  const qTokens = tokenize(query);
  if (!qTokens.length) return null;
  // Candidate entries that share at least one keyword.
  const candidates = await KnowledgeModel.find({ tenantId, keywords: { $in: qTokens } }).limit(50);
  let best: { score: number; doc: typeof candidates[number] } | null = null;
  for (const doc of candidates) {
    const overlap = doc.keywords.filter((k) => qTokens.includes(k)).length;
    const score = overlap / (new Set([...doc.keywords, ...qTokens]).size || 1);
    if (!best || score > best.score) best = { score, doc };
  }
  if (best && best.score >= 0.06) { void KnowledgeModel.updateOne({ _id: best.doc._id }, { $inc: { hits: 1 } }); return best.doc; }
  return null;
}
