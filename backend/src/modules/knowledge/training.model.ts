import { Schema, model, Types, type InferSchemaType } from 'mongoose';

/** A task asking a tutor to provide an accurate answer that trains the inbuilt AI. Pays ₵0.20 each. */
const trainingTaskSchema = new Schema({
  tenantId: { type: Types.ObjectId, ref: 'Tenant', required: true, index: true },
  question: { type: String, required: true },
  subject: String,
  level: String,
  status: { type: String, enum: ['open', 'done'], default: 'open', index: true },
  answeredBy: { type: Types.ObjectId, ref: 'User' },
  answer: String,
  rewardGHS: { type: Number, default: 0.20 },
}, { timestamps: true });

export type TrainingTask = InferSchemaType<typeof trainingTaskSchema>;
export const TrainingTaskModel = model('TrainingTask', trainingTaskSchema);
