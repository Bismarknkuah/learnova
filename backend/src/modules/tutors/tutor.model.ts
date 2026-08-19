import { Schema, model, Types, type InferSchemaType, type HydratedDocument } from 'mongoose';

/** Tutor profile — separate from the user record so search/indexing stays lean. */
const tutorSchema = new Schema(
  {
    tenantId: { type: Types.ObjectId, ref: 'Tenant', required: true, index: true },
    userId: { type: Types.ObjectId, ref: 'User', required: true, unique: true },
    headline: String,
    photos: { type: [String], default: [] },
    avatarUrl: String,
    isPeer: { type: Boolean, default: false, index: true },
    peerCertified: { type: Boolean, default: false },
    bio: String,
    subjects: { type: [String], index: true },
    levels: [String],                    // e.g. 'JHS','SHS','WASSCE','University'
    languages: { type: [String], default: ['English'] },
    hourlyRateGHS: { type: Number, required: true, index: true },
    rating: { type: Number, default: 0, index: true },
    reviewsCount: { type: Number, default: 0 },
    completedSessions: { type: Number, default: 0 },
    gender: { type: String, enum: ['male', 'female', 'other'] },
    teachingStyle: { type: String, enum: ['structured', 'exam-focused', 'conversational', 'visual', 'practical'] },
    country: { type: String, default: 'Ghana', index: true },
    availability: { type: [String], default: [] },   // e.g. ['weekday-evenings','weekends']
    ghanaCardVerified: { type: Boolean, default: false },
    verification: { docType: { type: String, enum: ['ghana_card', 'passport', 'license'] }, docNumber: String, status: { type: String, enum: ['none', 'pending', 'verified', 'rejected'], default: 'none' }, submittedAt: Date },
    aiTwinEnabled: { type: Boolean, default: false },
    aiTwinChunks: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

tutorSchema.index({ tenantId: 1, subjects: 1, hourlyRateGHS: 1, rating: -1 });

export type Tutor = InferSchemaType<typeof tutorSchema>;
export type TutorDoc = HydratedDocument<Tutor>;
export const TutorModel = model('Tutor', tutorSchema);
