import { Schema, model, Types, type InferSchemaType } from 'mongoose';

/** A student's personal replay layer for a session: bookmarks + private notes. */
const replayNoteSchema = new Schema({
  tenantId: { type: Types.ObjectId, ref: 'Tenant', required: true, index: true },
  sessionId: { type: Types.ObjectId, ref: 'Session', required: true, index: true },
  userId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
  bookmarks: [{ label: String, atMs: Number }],
  notes: { type: String, default: '' },
}, { timestamps: true });
replayNoteSchema.index({ sessionId: 1, userId: 1 }, { unique: true });

export type ReplayNote = InferSchemaType<typeof replayNoteSchema>;
export const ReplayNoteModel = model('ReplayNote', replayNoteSchema);
