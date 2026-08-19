import { Schema, model, Types, type InferSchemaType } from 'mongoose';

const scholarshipSchema = new Schema({
  tenantId: { type: Types.ObjectId, ref: 'Tenant', required: true, index: true },
  kind: { type: String, enum: ['scholarship', 'grant', 'fellowship', 'internship'], default: 'scholarship', index: true },
  title: { type: String, required: true },
  level: { type: String, enum: ['KG', 'Primary', 'JHS', 'SHS', 'Undergraduate', 'Postgraduate', 'Any'], default: 'Any', index: true },
  fundingType: { type: String, enum: ['full', 'partial'], default: 'partial', index: true },
  studyLocation: { type: String, enum: ['Ghana', 'Abroad', 'Any'], default: 'Ghana', index: true },
  sponsorType: { type: String, enum: ['external', 'school'], default: 'external' },
  sponsor: String,
  amountGHS: Number,
  description: String,
  eligibility: String,
  applyUrl: String,
  deadline: { type: Date, index: true },
  postedBy: { type: Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export type Scholarship = InferSchemaType<typeof scholarshipSchema>;
export const ScholarshipModel = model('Scholarship', scholarshipSchema);
