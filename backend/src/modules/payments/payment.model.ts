import { Schema, model, Types, type InferSchemaType, type HydratedDocument } from 'mongoose';

const paymentSchema = new Schema(
  {
    tenantId: { type: Types.ObjectId, ref: 'Tenant', required: true, index: true },
    bookingId: { type: Types.ObjectId, ref: 'Booking', index: true },
    studentId: { type: Types.ObjectId, ref: 'User', required: true },
    tutorUserId: { type: Types.ObjectId, ref: 'User', required: true },
    provider: { type: String, enum: ['paystack', 'mtn_momo', 'telecel', 'airteltigo'], required: true },
    reference: { type: String, required: true, unique: true, index: true }, // idempotency key
    amountGHS: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'succeeded', 'failed', 'refunded'], default: 'pending', index: true },
    authorizationUrl: String,
    raw: Schema.Types.Mixed,
  },
  { timestamps: true },
);

export type Payment = InferSchemaType<typeof paymentSchema>;
export type PaymentDoc = HydratedDocument<Payment>;
export const PaymentModel = model('Payment', paymentSchema);
