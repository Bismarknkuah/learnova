import { Schema, model, Types, type InferSchemaType } from 'mongoose';

/** An invitation for someone to join a specific school (tenant) with a given role. */
const inviteSchema = new Schema({
  tenantId: { type: Types.ObjectId, ref: 'Tenant', required: true, index: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  role: { type: String, enum: ['teacher', 'student', 'parent', 'school_admin'], required: true },
  token: { type: String, required: true, unique: true, index: true },
  status: { type: String, enum: ['pending', 'accepted', 'revoked'], default: 'pending', index: true },
  invitedBy: { type: Types.ObjectId, ref: 'User' },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

export type Invite = InferSchemaType<typeof inviteSchema>;
export const InviteModel = model('Invite', inviteSchema);
