import { Types } from 'mongoose';
import { MasteryModel } from './mastery.model.js';
import { bktUpdate } from './bkt.js';

export interface ConceptOutcome { concept: string; subject?: string; correct: boolean }

export const adaptiveService = {
  /** Apply observations to a student's mastery map using BKT. */
  async recordOutcomes(tenantId: string, studentId: string, outcomes: ConceptOutcome[]) {
    for (const o of outcomes) {
      const doc = await MasteryModel.findOneAndUpdate(
        { tenantId: new Types.ObjectId(tenantId), studentId: new Types.ObjectId(studentId), concept: o.concept },
        { $setOnInsert: { subject: o.subject, pKnown: 0.3 } },
        { upsert: true, new: true },
      );
      doc.pKnown = bktUpdate(doc.pKnown, o.correct);
      doc.attempts += 1;
      if (o.correct) doc.correct += 1;
      doc.lastSeen = new Date();
      await doc.save();
    }
    return this.masteryMap(tenantId, studentId);
  },

  async masteryMap(tenantId: string, studentId: string) {
    const docs = await MasteryModel.find({ tenantId, studentId }).sort({ pKnown: 1 });
    return docs.map((d) => ({
      concept: d.concept, subject: d.subject, pKnown: Math.round(d.pKnown * 100) / 100,
      attempts: d.attempts, mastered: d.pKnown >= 0.85,
    }));
  },

  /**
   * Recommend the next best activities: target the weakest concepts the student has touched,
   * plus a stretch concept. Returns concept + suggested action the client can route to
   * (revise material / take quiz / book a tutor for that concept).
   */
  async nextActivities(tenantId: string, studentId: string, limit = 5) {
    const docs = await MasteryModel.find({ tenantId, studentId }).sort({ pKnown: 1 }).limit(limit);
    return docs.map((d) => ({
      concept: d.concept,
      subject: d.subject,
      pKnown: Math.round(d.pKnown * 100) / 100,
      action: d.pKnown < 0.4 ? 'book_tutor' : d.pKnown < 0.7 ? 'practice_quiz' : 'revise_notes',
      reason: d.pKnown < 0.4 ? 'Foundational gap — a live session will help most'
        : d.pKnown < 0.7 ? 'Almost there — practice to consolidate'
        : 'Light revision to reach mastery',
    }));
  },
};
