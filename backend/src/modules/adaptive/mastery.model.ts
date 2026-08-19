import { Schema, model, Types, type InferSchemaType, type HydratedDocument } from 'mongoose';

/** Per-student, per-concept mastery estimate maintained by the adaptive engine (knowledge tracing). */
const masterySchema = new Schema(
  {
    tenantId: { type: Types.ObjectId, ref: 'Tenant', required: true, index: true },
    studentId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    concept: { type: String, required: true },     // e.g. 'physics.newtons-laws'
    subject: String,
    pKnown: { type: Number, default: 0.3 },         // probability the student has mastered it
    attempts: { type: Number, default: 0 },
    correct: { type: Number, default: 0 },
    lastSeen: Date,
  },
  { timestamps: true },
);
masterySchema.index({ tenantId: 1, studentId: 1, concept: 1 }, { unique: true });

export type Mastery = InferSchemaType<typeof masterySchema>;
export type MasteryDoc = HydratedDocument<Mastery>;
export const MasteryModel = model('Mastery', masterySchema);
