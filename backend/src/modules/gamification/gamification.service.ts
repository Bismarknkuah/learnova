import { Types } from 'mongoose';
import { bus, type DomainEvent } from '../../core/eventBus.js';
import { logger } from '../../core/logger.js';
import { GamificationModel } from './gamification.model.js';

const levelFor = (xp: number) => Math.max(1, Math.floor(xp / 500) + 1);

const BADGES: Record<string, { code: string; label: string; atXp: number }> = {
  starter: { code: 'starter', label: 'Getting Started', atXp: 50 },
  scholar: { code: 'scholar', label: 'Scholar', atXp: 1000 },
  master: { code: 'master', label: 'Master Learner', atXp: 5000 },
};

export const gamificationService = {
  async profile(tenantId: string, userId: string) {
    return GamificationModel.findOneAndUpdate(
      { tenantId: new Types.ObjectId(tenantId), userId: new Types.ObjectId(userId) },
      { $setOnInsert: {} }, { upsert: true, new: true },
    );
  },

  /** Award XP/coins, recompute level + streak, and unlock badges. Idempotent-ish per event. */
  async award(tenantId: string, userId: string, xp: number, coins = 0, reason = '') {
    const p = await this.profile(tenantId, userId);
    p.xp += xp;
    p.coins += coins;
    p.level = levelFor(p.xp);

    // Streak: increment if active on a new day, reset if a day was skipped.
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const last = p.streak?.lastActive ? new Date(p.streak.lastActive) : null;
    if (last) { last.setHours(0, 0, 0, 0); }
    const dayMs = 86_400_000;
    if (!last) p.streak = { count: 1, lastActive: new Date() };
    else if (today.getTime() - last.getTime() === dayMs) p.streak = { count: (p.streak!.count ?? 0) + 1, lastActive: new Date() };
    else if (today.getTime() - last.getTime() > dayMs) p.streak = { count: 1, lastActive: new Date() };

    for (const b of Object.values(BADGES)) {
      if (p.xp >= b.atXp && !p.badges.some((x) => x.code === b.code)) {
        p.badges.push({ code: b.code, label: b.label, earnedAt: new Date() });
      }
    }
    await p.save();
    logger.debug({ userId, xp, reason }, 'gamification.award');
    return p;
  },

  /** Catalogue of redeemable rewards, gated by XP. */
  rewards: [
    { id: 'discount', label: '5% marketplace discount', xp: 500 },
    { id: 'premium', label: 'Premium AI tutor access', xp: 1500 },
    { id: 'scholarship', label: 'Scholarship fast-track', xp: 3000 },
  ] as { id: string; label: string; xp: number }[],

  async redeem(tenantId: string, userId: string, rewardId: string) {
    const reward = this.rewards.find((r) => r.id === rewardId);
    if (!reward) throw new Error('Unknown reward');
    const p = await this.profile(tenantId, userId);
    if ((p.xp ?? 0) < reward.xp) throw new Error(`Need ${reward.xp} XP to redeem this (you have ${p.xp ?? 0}).`);
    if (p.redeemed?.some((r) => r.reward === rewardId)) return { already: true, perks: p.perks };
    p.perks = p.perks ?? { marketplaceDiscountPct: 0, premium: false, scholarshipFastTrack: false };
    if (rewardId === 'discount') p.perks.marketplaceDiscountPct = Math.max(p.perks.marketplaceDiscountPct ?? 0, 5);
    if (rewardId === 'premium') p.perks.premium = true;
    if (rewardId === 'scholarship') p.perks.scholarshipFastTrack = true;
    p.redeemed = [...(p.redeemed ?? []), { reward: rewardId, at: new Date() }];
    await p.save();
    return { redeemed: rewardId, perks: p.perks };
  },

  leaderboard(tenantId: string, limit = 20) {
    return GamificationModel.find({ tenantId }).sort({ xp: -1 }).limit(limit)
      .populate('userId', 'name');
  },
};

/** Turn learning events into XP automatically (decoupled, like notifications). */
export function startGamificationConsumers(): void {
  const award = (e: DomainEvent, key: string, xp: number) => {
    const uid = (e.payload as Record<string, unknown>)[key] as string | undefined;
    if (e.meta.tenantId && uid) void gamificationService.award(e.meta.tenantId, uid, xp, Math.floor(xp / 10), key);
  };
  bus.subscribe('assignment.reviewed', (e) => award(e, 'studentId', 30));
  bus.subscribe('exam.submitted', (e) => award(e, 'studentId', 50));
  bus.subscribe('booking.confirmed', (e) => award(e, 'studentId', 20));
  logger.info('gamification consumers started');
}
