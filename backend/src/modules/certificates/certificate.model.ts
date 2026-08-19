import { Schema, model, Types, type InferSchemaType } from 'mongoose';

/** Document stored off-chain; only the hash is anchored on-chain (cheap + privacy-safe). */
const certificateSchema = new Schema(
  {
    tenantId: { type: Types.ObjectId, ref: 'Tenant', required: true, index: true },
    studentId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    issuedBy: { type: Types.ObjectId, ref: 'User' },
    documentUrl: String,
    sha256: { type: String, required: true, index: true },
    chain: { network: String, txHash: String, anchoredAt: Date },
    verifyCode: { type: String, unique: true, index: true }, // encoded in the QR
  },
  { timestamps: true },
);
export type Certificate = InferSchemaType<typeof certificateSchema>;
export const CertificateModel = model('Certificate', certificateSchema);
