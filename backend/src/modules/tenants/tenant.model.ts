import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

/** A tenant is a school/institution, or the shared public marketplace. */
const tenantSchema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    type: { type: String, enum: ['school', 'marketplace'], default: 'school' },
    plan: { type: String, enum: ['free', 'pro', 'enterprise'], default: 'free' },
    settings: {
      locales: { type: [String], default: ['en'] },          // 'en','tw','ee','gaa','ha','fr'
      commissionRateOverride: { type: Number, default: null },
      featureFlags: { type: Map, of: Boolean, default: {} },
    },
    campuses: [{ name: String, region: String, address: String }],
    logoUrl: String,
    bannerUrl: String,
    primaryColor: { type: String, default: '#0E7C5A' },
    tagline: String,
    about: String,
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export type Tenant = InferSchemaType<typeof tenantSchema>;
export type TenantDoc = HydratedDocument<Tenant>;
export const TenantModel = model('Tenant', tenantSchema);
