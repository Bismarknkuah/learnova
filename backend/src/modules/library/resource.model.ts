import { Schema, model, Types, type InferSchemaType } from 'mongoose';

/** Free institutional resources: e-books, journals, lecture notes, recordings. */
const resourceSchema = new Schema({
  tenantId: { type: Types.ObjectId, ref: 'Tenant', required: true, index: true },
  type: { type: String, enum: ['ebook', 'journal', 'notes', 'recording'], required: true, index: true },
  title: { type: String, required: true },
  subject: { type: String, index: true },
  author: String,
  url: String,
  tags: [String],
  addedBy: { type: Types.ObjectId, ref: 'User' },
}, { timestamps: true });
resourceSchema.index({ tenantId: 1, type: 1, subject: 1 });

export type Resource = InferSchemaType<typeof resourceSchema>;
export const ResourceModel = model('Resource', resourceSchema);
