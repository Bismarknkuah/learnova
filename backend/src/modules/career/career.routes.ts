import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, ok } from '../../core/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { llm } from '../../ai/llm.js';

export const careerRoutes = Router();
careerRoutes.use(requireAuth);

const guidanceSchema = z.object({
  interests: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
  strengths: z.array(z.string()).default([]),
  level: z.string().optional(),
});

/** AI Career Mentor: maps a student's profile to careers, programs, scholarships, certs. */
careerRoutes.post('/guidance', validate(guidanceSchema), asyncHandler(async (req, res) => {
  const { interests, skills, strengths, level } = req.body;
  const raw = await llm.complete({
    system: 'You are a West African career mentor. Return ONLY JSON: ' +
      '{"careers":[{"title":"","why":""}],"universities":["..."],"scholarships":["..."],"certifications":["..."]}. No prose.',
    messages: [{ role: 'user', content: `Level: ${level ?? 'SHS'}\nInterests: ${interests.join(', ')}\nSkills: ${skills.join(', ')}\nStrengths: ${strengths.join(', ')}` }],
    maxTokens: 700,
  });
  let parsed: unknown;
  try { parsed = JSON.parse(raw.replace(/```json|```/g, '').trim()); }
  catch { parsed = { careers: [], universities: [], scholarships: [], certifications: [], note: 'AI guidance pending' }; }
  ok(res, parsed);
}));
