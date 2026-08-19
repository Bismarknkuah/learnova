import { Schema, model, Types, type InferSchemaType } from 'mongoose';

const conversationSchema = new Schema({
  tenantId: { type: Types.ObjectId, ref: 'Tenant', required: true, index: true },
  participantIds: { type: [{ type: Types.ObjectId, ref: 'User' }], required: true, index: true },
  lastMessage: String,
  lastAt: { type: Date, default: Date.now },
}, { timestamps: true });

const messageSchema = new Schema({
  tenantId: { type: Types.ObjectId, ref: 'Tenant', required: true, index: true },
  conversationId: { type: Types.ObjectId, ref: 'Conversation', required: true, index: true },
  fromId: { type: Types.ObjectId, ref: 'User', required: true },
  body: { type: String, required: true },
  readAt: Date,
}, { timestamps: true });

export type Message = InferSchemaType<typeof messageSchema>;
export const ConversationModel = model('Conversation', conversationSchema);
export const MessageModel = model('Message', messageSchema);
