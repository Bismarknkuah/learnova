import { Schema, model, Types, type InferSchemaType } from 'mongoose';

/** An open tutoring request a student posts; tutors browse and apply to it. */
const requestSchema = new Schema({
  tenantId: { type: Types.ObjectId, ref: 'Tenant', required: true, index: true },
  studentId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
  studentName: String,
  subject: { type: String, required: true },
  description: String,
  level: { type: String, default: 'Any' },
  preferredAt: Date,                 // exact date/time the student wants
  durationMin: { type: Number, default: 60 },
  budgetGHS: { type: Number, default: 0 },
  status: { type: String, enum: ['open', 'matched', 'closed'], default: 'open', index: true },
  acceptedTutorId: { type: Types.ObjectId, ref: 'User' },
  applicants: [{
    tutorId: { type: Types.ObjectId, ref: 'User' },
    tutorName: String,
    message: String,
    rateGHS: Number,
    appliedAt: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

export type TutorRequest = InferSchemaType<typeof requestSchema>;
export const TutorRequestModel = model('TutorRequest', requestSchema);
