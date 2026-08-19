import { Types, type FilterQuery } from 'mongoose';
import { TutorModel, type Tutor } from './tutor.model.js';

/**
 * Repository = the ONLY place that talks to the DB for tutors. Every method takes a tenantId
 * and injects it into the query, so tenant isolation is enforced in one place, not per-route.
 */
export interface TutorSearch {
  subject?: string;
  language?: string;
  maxPriceGHS?: number;
  minRating?: number;
  q?: string;
  page?: number;
  limit?: number;
}

export const tutorRepository = {
  async create(tenantId: string, data: Partial<Tutor>) {
    return TutorModel.create({ ...data, tenantId: new Types.ObjectId(tenantId) });
  },

  async findById(tenantId: string, id: string) {
    return TutorModel.findOne({ _id: id, tenantId, deletedAt: null });
  },

  async findByUserId(tenantId: string, userId: string) {
    return TutorModel.findOne({ userId, tenantId, deletedAt: null });
  },

  async update(tenantId: string, id: string, patch: Partial<Tutor>) {
    return TutorModel.findOneAndUpdate({ _id: id, tenantId, deletedAt: null }, patch, { new: true });
  },

  async search(tenantId: string, s: TutorSearch) {
    const filter: FilterQuery<Tutor> = { tenantId, deletedAt: null, isPublished: true };
    if (s.subject) filter.subjects = s.subject;
    if (s.language) filter.languages = s.language;
    if (s.maxPriceGHS) filter.hourlyRateGHS = { $lte: s.maxPriceGHS };
    if (s.minRating) filter.rating = { $gte: s.minRating };
    if (s.gender) filter.gender = s.gender;
    if (s.teachingStyle) filter.teachingStyle = s.teachingStyle;
    if (s.country) filter.country = s.country;
    if (s.availability) filter.availability = s.availability;
    if (s.isPeer !== undefined) filter.isPeer = s.isPeer;
    if (s.q) filter.$or = [{ headline: new RegExp(s.q, 'i') }, { bio: new RegExp(s.q, 'i') }];

    const page = Math.max(1, s.page ?? 1);
    const limit = Math.min(50, s.limit ?? 20);
    const [items, total] = await Promise.all([
      TutorModel.find(filter).populate('userId', 'name avatarUrl')
        .sort({ rating: -1, completedSessions: -1 }).skip((page - 1) * limit).limit(limit),
      TutorModel.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  },
};
