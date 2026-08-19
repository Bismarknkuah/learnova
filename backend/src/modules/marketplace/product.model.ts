import { Schema, model, Types, type InferSchemaType, type HydratedDocument } from 'mongoose';

/** A sellable item: recorded course, e-book, notes, past questions, study guide, template. */
const productSchema = new Schema(
  {
    tenantId: { type: Types.ObjectId, ref: 'Tenant', required: true, index: true },
    sellerId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['course', 'ebook', 'notes', 'past_questions', 'guide', 'template', 'research'], required: true, index: true },
    title: { type: String, required: true },
    description: String,
    subject: { type: String, index: true },
    priceGHS: { type: Number, required: true, min: 0 },
    previewUrl: String,
    contentUrl: String,                 // delivered only to buyers
    coverUrl: String,
    rating: { type: Number, default: 0 },
    salesCount: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
productSchema.index({ tenantId: 1, type: 1, subject: 1, isPublished: 1 });

export type Product = InferSchemaType<typeof productSchema>;
export type ProductDoc = HydratedDocument<Product>;
export const ProductModel = model('Product', productSchema);
