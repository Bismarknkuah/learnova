import { Schema, model, Types, type InferSchemaType, type HydratedDocument } from 'mongoose';

/**
 * One users collection, role-discriminated. Every user is tenant-scoped.
 * Minor + consent fields support Ghana Data Protection Act (Act 843) obligations.
 */
export const userSchema = new Schema(
  {
    tenantId: { type: Types.ObjectId, ref: 'Tenant', required: true, index: true },
    role: {
      type: String,
      enum: ['student', 'teacher', 'parent', 'school_admin', 'super_admin'],
      required: true,
    },
    name: { type: String, required: true },
    email: { type: String, lowercase: true, trim: true, index: true, sparse: true },
    phone: { type: String, index: true, sparse: true },      // mobile-money number
    passwordHash: { type: String, select: false },
    mfaEnabled: { type: Boolean, default: false },
    mfaSecret: { type: String, select: false },
    googleId: { type: String, index: true, sparse: true },
    avatarUrl: String,

    locale: { type: String, default: 'en' },

    // Learner onboarding profile
    educationLevel: { type: String, enum: ['KG', 'Primary', 'JHS', 'SHS', 'Undergraduate', 'Postgraduate', 'PhD', 'WASSCE', 'Tertiary', 'Other'] },
    programme: String,   // SHS track or tertiary programme (e.g. General Science, Business, BSc Computer Science)
    subjects: { type: [String], default: [] },   // courses the student is taking
    skills: { type: [String], default: [] },
    interests: { type: [String], default: [] },
    bio: String,
    achievements: { type: [String], default: [] },

    // Minors & consent
    dateOfBirth: Date,
    isMinor: { type: Boolean, default: false },
    guardianId: { type: Types.ObjectId, ref: 'User' },
    consentGivenAt: Date,

    status: { type: String, enum: ['active', 'suspended', 'pending'], default: 'active' },
    lastLoginAt: Date,
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

userSchema.index({ tenantId: 1, role: 1 });
userSchema.index({ tenantId: 1, email: 1 }, { unique: true, sparse: true });

export type User = InferSchemaType<typeof userSchema>;
export type UserDoc = HydratedDocument<User>;
export const UserModel = model('User', userSchema);
