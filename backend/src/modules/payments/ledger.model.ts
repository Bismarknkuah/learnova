import { Schema, model, Types, type InferSchemaType } from 'mongoose';

/** Append-only ledger. Balances are DERIVED by summing entries — never mutated in place. */
const ledgerSchema = new Schema(
  {
    tenantId: { type: Types.ObjectId, ref: 'Tenant', required: true, index: true },
    account: { type: String, required: true, index: true }, // 'teacher:<id>' | 'platform_revenue' | 'student:<id>'
    type: { type: String, enum: ['CREDIT', 'DEBIT'], required: true },
    amountGHS: { type: Number, required: true },
    paymentId: { type: Types.ObjectId, ref: 'Payment', index: true },
    memo: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export type LedgerEntry = InferSchemaType<typeof ledgerSchema>;
export const LedgerModel = model('LedgerEntry', ledgerSchema);
