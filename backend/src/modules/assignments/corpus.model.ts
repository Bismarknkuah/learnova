import { Schema, model, Types, type InferSchemaType } from 'mongoose';
/** Stored submission texts used as the plagiarism comparison corpus. */
const corpusSchema = new Schema({
  tenantId: { type: Types.ObjectId, ref: 'Tenant', required: true, index: true },
  userId: { type: Types.ObjectId, ref: 'User', index: true },
  assignmentId: { type: Types.ObjectId, ref: 'Assignment', index: true },
  text: { type: String, required: true },
}, { timestamps: true });
export type SubmissionText = InferSchemaType<typeof corpusSchema>;
export const SubmissionTextModel = model('SubmissionText', corpusSchema);
