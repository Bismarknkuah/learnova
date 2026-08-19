import { Router } from 'express';
import { asyncHandler, ok } from '../../core/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { UserModel } from '../users/user.model.js';
import { CertificateModel } from '../certificates/certificate.model.js';
import { ProductModel } from '../marketplace/product.model.js';
import { GamificationModel } from '../gamification/gamification.model.js';
import { ResultModel } from '../tenants/school.models.js';

export const portfolioRoutes = Router();
portfolioRoutes.use(requireAuth);

/** #8 Student Portfolio Builder — auto-assembles a portfolio from across the platform. */
portfolioRoutes.get('/', asyncHandler(async (req, res) => {
  const { tenantId, id } = req.user!;
  const [user, certificates, results, projects, gami] = await Promise.all([
    UserModel.findById(id).select('name subjects skills achievements educationLevel'),
    CertificateModel.find({ tenantId, studentId: id }).select('title sha256 verifyCode createdAt'),
    ResultModel.find({ tenantId, studentId: id }).select('courseTitle score grade term').sort('-createdAt'),
    ProductModel.find({ tenantId, sellerId: id }).select('title type subject salesCount'),
    GamificationModel.findOne({ tenantId, userId: id }).select('xp level badges'),
  ]);

  const achievements: string[] = [...(user?.get('achievements') ?? [])];
  for (const b of gami?.badges ?? []) achievements.push(b.label);
  for (const r of results) if ((r.score ?? 0) >= 80) achievements.push(`Distinction in ${r.courseTitle} (${r.score}%)`);
  if ((gami?.xp ?? 0) >= 1000) achievements.push(`${gami!.xp} learning XP — Level ${gami!.level}`);

  const skills = (user?.get('skills') ?? []).length ? user!.get('skills') : (user?.get('subjects') ?? []);

  ok(res, {
    profile: { name: user?.get('name'), educationLevel: user?.get('educationLevel'), subjects: user?.get('subjects') ?? [] },
    skills,
    certificates: certificates.map((c) => ({ title: c.title, verifyCode: c.verifyCode, issuedAt: c.get('createdAt') })),
    results,
    projects: projects.map((p) => ({ title: p.title, type: p.type, subject: p.subject, salesCount: p.salesCount })),
    achievements: [...new Set(achievements)],
    stats: { xp: gami?.xp ?? 0, level: gami?.level ?? 1, certificates: certificates.length, projects: projects.length },
  });
}));

portfolioRoutes.patch('/', asyncHandler(async (req, res) => {
  const update: Record<string, unknown> = {};
  if (Array.isArray(req.body.skills)) update.skills = req.body.skills;
  if (Array.isArray(req.body.achievements)) update.achievements = req.body.achievements;
  const user = await UserModel.findByIdAndUpdate(req.user!.id, { $set: update }, { new: true }).select('skills achievements');
  ok(res, user);
}));
