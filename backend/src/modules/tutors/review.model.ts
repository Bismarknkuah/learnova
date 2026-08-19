import { Schema, model, Types, type InferSchemaType } from 'mongoose';

/** A student's review of a tutor. Drives the tutor's aggregate rating. */
const reviewSchema = new Schema({
  tenantId: { type: Types.ObjectId, ref: 'Tenant', required: true, index: true },
  tutorId: { type: Types.ObjectId, ref: 'Tutor', required: true, index: true },
  studentId: { type: Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: String,
}, { timestamps: true });
reviewSchema.index({ tutorId: 1, studentId: 1 }, { unique: true });   // one review per student per tutor

export type Review = InferSchemaType<typeof reviewSchema>;
export const ReviewModel = model('TutorReview', reviewSchema);
