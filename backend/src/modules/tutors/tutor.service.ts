import { NotFoundError } from '../../core/errors.js';
import { tutorRepository, type TutorSearch } from './tutor.repository.js';
import { agentSystem } from '../../agents/index.js';
import type { Tutor } from './tutor.model.js';

export const tutorService = {
  async createProfile(tenantId: string, userId: string, data: Partial<Tutor>) {
    return tutorRepository.create(tenantId, { ...data, userId: userId as never });
  },

  async getProfile(tenantId: string, id: string) {
    const tutor = await tutorRepository.findById(tenantId, id);
    if (!tutor) throw new NotFoundError('Tutor not found');
    return tutor;
  },

  async updateProfile(tenantId: string, id: string, patch: Partial<Tutor>) {
    const tutor = await tutorRepository.update(tenantId, id, patch);
    if (!tutor) throw new NotFoundError('Tutor not found');
    return tutor;
  },

  /**
   * Search + AI ranking. The repository does the cheap DB filtering; the RecommendationAgent
   * re-ranks the candidates against the student's profile (hybrid content/quality scoring).
   */
  async searchAndRank(tenantId: string, search: TutorSearch, student?: Record<string, unknown>) {
    const { items, total, page, limit } = await tutorRepository.search(tenantId, search);

    // Map every tutor doc to one consistent card shape (incl. the user's name).
    const toCard = (t: (typeof items)[number], extra: { score?: number; why?: string[] } = {}) => {
      const u = t.userId as unknown as { name?: string; avatarUrl?: string } | null;
      return {
        id: String(t._id),
        name: u?.name ?? 'Tutor',
        avatarUrl: u?.avatarUrl,
        headline: t.headline,
        subjects: t.subjects, languages: t.languages,
        hourlyRateGHS: t.hourlyRateGHS, rating: t.rating, reviewsCount: t.reviewsCount,
        completedSessions: t.completedSessions, ghanaCardVerified: t.ghanaCardVerified,
        gender: t.gender, teachingStyle: t.teachingStyle, country: t.country, availability: t.availability,
        isPeer: t.isPeer, peerCertified: t.peerCertified,
        aiTwinEnabled: t.aiTwinEnabled, ...extra,
      };
    };

    if (!student) {
      return { items: items.map((t) => toCard(t)), total, page, limit, ranked: false };
    }

    // Student → AI re-rank, then merge scores back onto the full docs (so name survives).
    const byId = new Map(items.map((t) => [String(t._id), t]));
    const ranked = await agentSystem.supervisor.route('recommend_tutors', {
      input: {
        student,
        tutors: items.map((t) => ({
          id: String(t._id), subjects: t.subjects, languages: t.languages,
          hourlyRateGHS: t.hourlyRateGHS, rating: t.rating,
          completedSessions: t.completedSessions, level: search.subject, availability: t.availability,
        })),
      },
    });
    const cards = (ranked.recommended as { tutor: { id: string }; score: number; why: string[] }[])
      .map((r) => { const doc = byId.get(r.tutor.id); return doc ? toCard(doc, { score: r.score, why: r.why }) : null; })
      .filter(Boolean);
    return { items: cards, total, page, limit, ranked: true };
  },
};
