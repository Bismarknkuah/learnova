import { Schema, model, Types, type InferSchemaType, type HydratedDocument } from 'mongoose';

const profileSchema = new Schema(
  {
    tenantId: { type: Types.ObjectId, ref: 'Tenant', required: true, index: true },
    userId: { type: Types.ObjectId, ref: 'User', required: true, unique: true },
    xp: { type: Number, default: 0, index: true },
    coins: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    streak: { count: { type: Number, default: 0 }, lastActive: Date },
    badges: [{ code: String, label: String, earnedAt: Date }],
    perks: { marketplaceDiscountPct: { type: Number, default: 0 }, premium: { type: Boolean, default: false }, scholarshipFastTrack: { type: Boolean, default: false } },
    redeemed: [{ reward: String, at: Date }],
  },
  { timestamps: true },
);
profileSchema.index({ tenantId: 1, xp: -1 }); // leaderboard

export type GamificationProfile = InferSchemaType<typeof profileSchema>;
export type GamificationDoc = HydratedDocument<GamificationProfile>;
export const GamificationModel = model('GamificationProfile', profileSchema);
