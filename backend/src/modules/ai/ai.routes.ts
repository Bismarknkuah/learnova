import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, ok } from '../../core/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { bus } from '../../core/eventBus.js';
import { agentSystem } from '../../agents/index.js';

export const aiRoutes = Router();
aiRoutes.use(requireAuth);

const askSchema = z.object({
  question: z.string().min(2),
  twinId: z.string().optional(),
  subject: z.string().optional(),
  studentLevel: z.string().optional(),
});

// Ask the AI Twin or the general learning companion.
aiRoutes.post('/ask', validate(askSchema), asyncHandler(async (req, res) => {
  // With an external key, use the full agent/LLM. Otherwise, answer from the INBUILT knowledge base.
  const aiCfg = await getAiConfig();
  if (aiCfg.apiKey || aiCfg.provider === 'custom') {
    const result = await agentSystem.supervisor.route('ai_twin', { input: req.body });
    ok(res, result);
    return;
  }
  const q = (req.body.question as string) ?? '';
  const hit = await recall(req.user!.tenantId, q);
  if (hit) { ok(res, { answer: hit.answer, source: 'inbuilt', subject: hit.subject ?? null, citations: [] }); return; }
  // Fall back to the digital library: surface relevant resources the student can read.
  const terms = q.toLowerCase().split(/\W+/).filter((w) => w.length > 3).slice(0, 6);
  if (terms.length) {
    const res2 = await ResourceModel.find({ tenantId: req.user!.tenantId, $or: [ { title: new RegExp(terms.join('|'), 'i') }, { subject: new RegExp(terms.join('|'), 'i') } ] }).limit(3).select('title type subject');
    if (res2.length) {
      ok(res, { answer: `Here's what I found in your library on this:\n\n${res2.map((r) => `• ${r.title}${r.subject ? ` (${r.subject})` : ''}`).join('\n')}\n\nOpen the Library to read these. I'm also always learning — a teacher can teach me a direct answer.`, source: 'inbuilt', citations: [] });
      return;
    }
  }
  // Always give a genuinely useful, structured response — never "I know nothing".
  ok(res, {
    answer: `Let's tackle "${q.slice(0, 140)}" step by step:\n\n1. What is being asked? Pull out the key terms.\n2. Which rule, formula or definition applies?\n3. Work it through one step at a time.\n4. Check the answer makes sense.\n\nTip: search the Library or Exam Prep for this topic, and a teacher can teach me a direct answer so I nail it next time.`,
    source: 'inbuilt', citations: [],
  });
}));

// Teach the inbuilt assistant a Q&A — this is how it grows over time, with no external AI.
aiRoutes.post('/teach', requireRole('teacher', 'school_admin', 'super_admin'), validate(z.object({
  question: z.string().min(3), answer: z.string().min(3), subject: z.string().optional(),
})), asyncHandler(async (req, res) => {
  const kw = tokenize(`${req.body.question} ${req.body.subject ?? ''}`);
  const k = await KnowledgeModel.create({ tenantId: req.user!.tenantId, question: req.body.question, answer: req.body.answer, subject: req.body.subject, keywords: kw, source: 'taught', addedBy: req.user!.id });
  ok(res, { taught: true, id: k._id, keywords: kw }, undefined, 201);
}));

// What the assistant currently knows (size of its brain) — shows it growing.
aiRoutes.get('/knowledge/stats', asyncHandler(async (req, res) => {
  const [count, top] = await Promise.all([
    KnowledgeModel.countDocuments({ tenantId: req.user!.tenantId }),
    KnowledgeModel.find({ tenantId: req.user!.tenantId }).sort('-hits').limit(5).select('question hits subject'),
  ]);
  ok(res, { entries: count, mostUsed: top });
}));

// Teacher trains their AI Twin by uploading lesson text.
const trainSchema = z.object({ text: z.string().min(20), source: z.string().optional() });
aiRoutes.post('/twin/lessons', requireRole('teacher'), validate(trainSchema),
  asyncHandler(async (req, res) => {
    await bus.publish('teacher.lesson.uploaded',
      { teacherId: req.user!.id, text: req.body.text, source: req.body.source },
      { tenantId: req.user!.tenantId });
    ok(res, { status: 'training' }, undefined, 202);
  }),
);

import { llm } from '../../ai/llm.js';
import { config } from '../../config/index.js';
import { getAiConfig, setAiConfig } from '../../ai/provider.js';
import { KnowledgeModel, recall, tokenize } from '../knowledge/knowledge.model.js';
import { LangModelModel, trainInto, generate as lmGenerate } from '../langmodel/langmodel.model.js';
import { ResourceModel } from '../library/resource.model.js';
import { TrainingTaskModel } from '../knowledge/training.model.js';
import { LedgerModel } from '../payments/ledger.model.js';
import { requireRole } from '../../middleware/rbac.js';

// ---- #9 AI Resume & CV Builder ----
const cvSchema = z.object({
  kind: z.enum(['cv', 'statement', 'cover_letter']),
  target: z.string().optional(),           // role / programme / scholarship
  name: z.string().optional(),
  highlights: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
});
aiRoutes.post('/cv', validate(cvSchema), asyncHandler(async (req, res) => {
  const { kind, target, name, highlights = [], skills = [] } = req.body;
  const label = kind === 'cv' ? 'CV/résumé' : kind === 'statement' ? 'personal statement' : 'cover letter';

  if (config.ai.anthropicApiKey) {
    const text = await llm.complete({
      system: `You are a career writer for Ghanaian students. Write a polished ${label}${target ? ` targeting "${target}"` : ''}. Use clear sections and a professional tone. Return plain text only.`,
      messages: [{ role: 'user', content: `Name: ${name ?? 'Student'}\nSkills: ${skills.join(', ')}\nHighlights/achievements:\n- ${highlights.join('\n- ')}` }],
      maxTokens: 900,
    });
    ok(res, { kind, text });
    return;
  }
  // Internal fallback — assemble a structured document from the provided data.
  let text = '';
  if (kind === 'cv') {
    text = `${name ?? 'Student Name'}\n${'='.repeat((name ?? 'Student Name').length)}\n\nPROFILE\nMotivated student${target ? ` aspiring to ${target}` : ''} with a strong academic record.\n\nSKILLS\n${skills.map((s) => `• ${s}`).join('\n') || '• (add your skills)'}\n\nACHIEVEMENTS\n${highlights.map((h) => `• ${h}`).join('\n') || '• (add achievements)'}\n`;
  } else if (kind === 'statement') {
    text = `Personal Statement${target ? ` — ${target}` : ''}\n\nMy name is ${name ?? '...'}. I am applying ${target ? `to ${target}` : 'for this opportunity'} because of my commitment to learning and growth. ${highlights.length ? `Among my proudest achievements: ${highlights.join('; ')}.` : ''} My skills in ${skills.join(', ') || 'several areas'} have prepared me to contribute meaningfully. I am eager to bring this dedication forward.`;
  } else {
    text = `Dear Hiring Manager,\n\nI am writing to express my interest${target ? ` in ${target}` : ''}. ${highlights.length ? `I have ${highlights.join(', ')}.` : ''} My skills include ${skills.join(', ') || 'a range of competencies'}, and I am confident I can add value.\n\nThank you for your consideration.\n\nSincerely,\n${name ?? 'Student'}`;
  }
  ok(res, { kind, text, note: 'Generated from a template (add an Anthropic key for AI-written prose).' });
}));

// ---- #10 AI Interview Simulator ----
const interviewSchema = z.object({
  type: z.enum(['job', 'scholarship', 'admission']),
  role: z.string().optional(),
  history: z.array(z.object({ role: z.enum(['interviewer', 'candidate']), content: z.string() })).default([]),
});
const FALLBACK_Q: Record<string, string[]> = {
  job: ['Tell me about yourself.', 'Why do you want this role?', 'Describe a challenge you overcame.', 'Where do you see yourself in 5 years?', 'Do you have any questions for us?'],
  scholarship: ['Why do you deserve this scholarship?', 'What are your career goals?', 'How will this scholarship help your community?', 'Describe a leadership experience.', 'How do you handle setbacks?'],
  admission: ['Why this programme?', 'What are your academic strengths?', 'Describe a project you are proud of.', 'How will you contribute to campus life?', 'What are your long-term goals?'],
};
aiRoutes.post('/interview', validate(interviewSchema), asyncHandler(async (req, res) => {
  const { type, role, history } = req.body;
  const lastAnswer = [...history].reverse().find((h) => h.role === 'candidate')?.content;

  if (config.ai.anthropicApiKey) {
    const sys = `You are a ${type} interviewer${role ? ` for "${role}"` : ''}. Ask ONE question at a time. If the candidate just answered, FIRST give one line of brief constructive feedback, THEN ask the next question. Keep it realistic and encouraging. Return JSON: {"feedback":"...","question":"..."}.`;
    const msgs = history.map((h) => ({ role: (h.role === 'interviewer' ? 'assistant' : 'user') as 'assistant' | 'user', content: h.content }));
    if (!msgs.length) msgs.push({ role: 'user', content: 'Please begin the interview.' });
    try {
      const raw = await llm.complete({ system: sys, messages: msgs, maxTokens: 400 });
      const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
      ok(res, parsed); return;
    } catch { /* fall through */ }
  }
  // Fallback: walk the question bank + simple heuristic feedback.
  const asked = history.filter((h) => h.role === 'interviewer').length;
  const bank = FALLBACK_Q[type];
  const question = bank[Math.min(asked, bank.length - 1)];
  let feedback = '';
  if (lastAnswer) {
    const words = lastAnswer.trim().split(/\s+/).length;
    feedback = words < 20 ? 'Try to expand your answer with a concrete example.' : words > 150 ? 'Strong detail — tighten it so the key point stands out.' : 'Good, well-structured answer.';
  }
  ok(res, { feedback, question, done: asked >= bank.length });
}));

// ---- #13 AI Language Tutor (multilingual, incl. Ghanaian languages) ----
const LANGS: Record<string, { native: string; hello: string }> = {
  english: { native: 'English', hello: 'Hello! Let us practice. How are you today?' },
  twi: { native: 'Twi (Akan)', hello: 'Akwaaba! Wo ho te sɛn? Yɛnsua kasa no.' },
  fante: { native: 'Fante', hello: 'Akwaaba! Wo ho te sɛn?' },
  ga: { native: 'Ga', hello: 'Ojekoo! Te aba oyaa?' },
  ewe: { native: 'Ewe', hello: 'Woezɔ! Aleke nèfɔ?' },
  hausa: { native: 'Hausa', hello: 'Sannu! Yaya kake?' },
  sefwi: { native: 'Sefwi', hello: 'Akwaaba! Wo ho te sɛn?' },
  kusaal: { native: 'Kusaal', hello: 'Fʋ niŋ ya? (How are you?)' },
  dagbani: { native: 'Dagbani', hello: 'Dasiba! A yuli?' },
  french: { native: 'French', hello: 'Bonjour ! Comment ça va aujourd’hui ?' },
  spanish: { native: 'Spanish', hello: '¡Hola! ¿Cómo estás hoy?' },
  arabic: { native: 'Arabic', hello: 'مرحبا! كيف حالك اليوم؟' },
};
aiRoutes.get('/language-tutor/languages', asyncHandler(async (_req, res) =>
  ok(res, Object.entries(LANGS).map(([id, v]) => ({ id, native: v.native })))));

const langSchema = z.object({ language: z.string(), message: z.string().optional(), history: z.array(z.object({ role: z.enum(['tutor', 'student']), content: z.string() })).default([]) });
aiRoutes.post('/language-tutor', validate(langSchema), asyncHandler(async (req, res) => {
  const lang = LANGS[req.body.language?.toLowerCase()] ?? LANGS.english;
  if (!req.body.message) { ok(res, { reply: lang.hello }); return; }   // opening greeting

  if (config.ai.anthropicApiKey) {
    const msgs = req.body.history.map((h) => ({ role: (h.role === 'tutor' ? 'assistant' : 'user') as 'assistant' | 'user', content: h.content }));
    msgs.push({ role: 'user', content: req.body.message });
    const reply = await llm.complete({
      system: `You are a friendly ${lang.native} language tutor. Converse ONLY in ${lang.native}. Keep replies short, correct the student's mistakes gently, and ask a follow-up question. If ${lang.native} uses non-Latin script, include a short English gloss in brackets.`,
      messages: msgs, maxTokens: 350,
    });
    ok(res, { reply }); return;
  }
  ok(res, { reply: `(${lang.native}) ${lang.hello}`, note: 'Add an Anthropic key for full ' + lang.native + ' conversation.' });
}));

// ---- #15 AI Research Assistant ----
const researchSchema = z.object({
  tool: z.enum(['lit_review', 'citation', 'gap', 'summarize']),
  topic: z.string().optional(), text: z.string().optional(),
  citation: z.object({ authors: z.string(), title: z.string(), year: z.string(), source: z.string().optional(), url: z.string().optional() }).optional(),
  style: z.enum(['APA', 'MLA', 'Harvard']).optional(),
});
aiRoutes.post('/research', validate(researchSchema), asyncHandler(async (req, res) => {
  const { tool } = req.body;

  // Citation generation is deterministic — done internally without any AI.
  if (tool === 'citation' && req.body.citation) {
    const c = req.body.citation; const style = req.body.style ?? 'APA';
    let out = '';
    if (style === 'APA') out = `${c.authors} (${c.year}). ${c.title}.${c.source ? ` ${c.source}.` : ''}${c.url ? ` ${c.url}` : ''}`;
    else if (style === 'MLA') out = `${c.authors}. "${c.title}." ${c.source ?? ''} (${c.year}).${c.url ? ` ${c.url}.` : ''}`;
    else out = `${c.authors} ${c.year}, '${c.title}',${c.source ? ` ${c.source},` : ''}${c.url ? ` viewed at ${c.url}` : ''}`;
    ok(res, { result: out.trim() }); return;
  }

  if (config.ai.anthropicApiKey) {
    const prompts: Record<string, string> = {
      lit_review: `Provide a concise literature-review outline for the topic below: key themes, seminal works to look for, and sub-questions. Topic: ${req.body.topic ?? ''}`,
      gap: `Identify 3-5 promising research gaps and open questions for this topic/abstract:\n${req.body.topic ?? req.body.text ?? ''}`,
      summarize: `Summarise this paper/excerpt in 5 bullet points (aim, method, findings, limitations, implications):\n${(req.body.text ?? '').slice(0, 8000)}`,
    };
    const result = await llm.complete({ system: 'You are a rigorous research assistant for university students. Be concise and accurate.', messages: [{ role: 'user', content: prompts[tool] }], maxTokens: 800 });
    ok(res, { result }); return;
  }

  // Internal fallbacks
  if (tool === 'summarize') {
    const sents = (req.body.text ?? '').replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/).filter((s) => s.length > 15);
    ok(res, { result: sents.slice(0, 5).map((s, i) => `${i + 1}. ${s}`).join('\n') || 'Provide paper text to summarise.', note: 'Extractive summary (add an AI key for analytical summaries).' });
    return;
  }
  ok(res, { result: `For "${req.body.topic ?? 'your topic'}": ${tool === 'lit_review' ? 'review foundational papers, recent reviews (last 5 years), and conflicting findings; group by theme.' : 'look for under-studied populations, untested assumptions, and methods not yet applied.'}`, note: 'Add an Anthropic key for AI-generated research analysis.' });
}));

// ---- Self-training language model (classical n-gram, no external AI) ----
aiRoutes.post('/lm/train', requireRole('teacher', 'school_admin', 'super_admin'), validate(z.object({ language: z.string(), text: z.string().min(20) })), asyncHandler(async (req, res) => {
  const lang = req.body.language.toLowerCase();
  const m = await LangModelModel.findOne({ tenantId: req.user!.tenantId, language: lang })
    ?? new LangModelModel({ tenantId: req.user!.tenantId, language: lang, trigrams: {}, vocab: [] });
  trainInto(m as unknown as { trigrams: Record<string, Record<string, number>>; vocab: string[]; tokensTrained: number; documents: number }, req.body.text);
  m.markModified('trigrams'); m.markModified('vocab');
  await m.save();
  ok(res, { language: lang, tokensTrained: m.tokensTrained, vocabulary: m.vocab.length, documents: m.documents });
}));

aiRoutes.get('/lm/stats', asyncHandler(async (req, res) => {
  const models = await LangModelModel.find({ tenantId: req.user!.tenantId }).select('language tokensTrained vocab documents');
  ok(res, models.map((m) => ({ language: m.language, tokensTrained: m.tokensTrained, vocabulary: m.vocab.length, documents: m.documents })));
}));

aiRoutes.post('/lm/generate', validate(z.object({ language: z.string(), seed: z.string().default('the student') })), asyncHandler(async (req, res) => {
  const m = await LangModelModel.findOne({ tenantId: req.user!.tenantId, language: req.body.language.toLowerCase() });
  if (!m || m.tokensTrained < 50) { ok(res, { text: '', trained: false, note: 'Model needs more training text first.' }); return; }
  ok(res, { text: lmGenerate(m.trigrams as Record<string, Record<string, number>>, req.body.seed, 40), trained: true });
}));

// ---- Paid AI-training tasks for tutors (₵0.20 each) ----
aiRoutes.get('/training/next', requireRole('teacher', 'school_admin', 'super_admin'), asyncHandler(async (req, res) => {
  const task = await TrainingTaskModel.findOne({ tenantId: req.user!.tenantId, status: 'open' }).sort('createdAt');
  const remaining = await TrainingTaskModel.countDocuments({ tenantId: req.user!.tenantId, status: 'open' });
  ok(res, { task, remaining });
}));

aiRoutes.post('/training/:id/submit', requireRole('teacher', 'school_admin', 'super_admin'),
  validate(z.object({ answer: z.string().min(10) })), asyncHandler(async (req, res) => {
  const task = await TrainingTaskModel.findOne({ _id: req.params.id, tenantId: req.user!.tenantId, status: 'open' });
  if (!task) { res.status(404).json({ error: 'Task not available' }); return; }
  task.status = 'done'; task.answer = req.body.answer; task.answeredBy = new Types.ObjectId(req.user!.id); await task.save();
  // Feed the inbuilt AI.
  await KnowledgeModel.create({ tenantId: req.user!.tenantId, question: task.question, answer: req.body.answer, subject: task.subject, keywords: tokenize(`${task.question} ${task.subject ?? ''}`), source: 'taught', addedBy: req.user!.id });
  // Pay the tutor ₵0.20 to their ledger balance.
  await LedgerModel.create({ tenantId: req.user!.tenantId, account: `teacher:${req.user!.id}`, type: 'CREDIT', amountGHS: task.rewardGHS, memo: `ai-training:${task._id}` });
  ok(res, { paidGHS: task.rewardGHS, message: `Thanks! ₵${task.rewardGHS.toFixed(2)} added to your earnings and the AI just learned this.` });
}));

// ---- Multi-provider AI connector (super admin) ----
aiRoutes.get('/provider', requireRole('super_admin'), asyncHandler(async (_req, res) => {
  const c = await getAiConfig();
  ok(res, { provider: c.provider, baseUrl: c.baseUrl, model: c.model, connected: !!c.apiKey || c.provider === 'custom', keySet: !!c.apiKey });
}));

aiRoutes.patch('/provider', requireRole('super_admin'), validate(z.object({
  provider: z.enum(['anthropic', 'openai', 'deepseek', 'custom']),
  apiKey: z.string().optional(), baseUrl: z.string().optional(), model: z.string().optional(),
})), asyncHandler(async (req, res) => {
  const c = await setAiConfig(req.body);
  ok(res, { provider: c.provider, baseUrl: c.baseUrl, model: c.model, keySet: !!c.apiKey });
}));

aiRoutes.post('/provider/test', requireRole('super_admin'), asyncHandler(async (_req, res) => {
  const reply = await (await import('../../ai/llm.js')).llm.complete({ messages: [{ role: 'user', content: 'Reply with exactly: Learnova AI connected.' }], maxTokens: 32 });
  ok(res, { reply });
}));
