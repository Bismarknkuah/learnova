import { Schema, model, Types, type InferSchemaType } from 'mongoose';

/** A tutor/peer-tutor payout request drawn against their ledger balance. */
const withdrawalSchema = new Schema({
  tenantId: { type: Types.ObjectId, ref: 'Tenant', required: true, index: true },
  userId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
  amountGHS: { type: Number, required: true },
  method: { type: String, enum: ['mtn_momo', 'bank', 'telecel', 'airteltigo'], default: 'mtn_momo' },
  destination: { type: String, required: true },     // phone or account number
  status: { type: String, enum: ['pending', 'paid', 'rejected'], default: 'pending', index: true },
  processedAt: Date,
}, { timestamps: true });

export type Withdrawal = InferSchemaType<typeof withdrawalSchema>;
export const WithdrawalModel = model('Withdrawal', withdrawalSchema);
