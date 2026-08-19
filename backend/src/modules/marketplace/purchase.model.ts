import { Schema, model, Types, type InferSchemaType } from 'mongoose';

const purchaseSchema = new Schema(
  {
    tenantId: { type: Types.ObjectId, ref: 'Tenant', required: true, index: true },
    productId: { type: Types.ObjectId, ref: 'Product', required: true, index: true },
    buyerId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    pricePaidGHS: { type: Number, required: true },
    paymentId: { type: Types.ObjectId, ref: 'Payment' },
    status: { type: String, enum: ['pending', 'completed', 'refunded'], default: 'pending', index: true },
  },
  { timestamps: true },
);
purchaseSchema.index({ tenantId: 1, buyerId: 1, productId: 1 }, { unique: true });

export type Purchase = InferSchemaType<typeof purchaseSchema>;
export const PurchaseModel = model('Purchase', purchaseSchema);
