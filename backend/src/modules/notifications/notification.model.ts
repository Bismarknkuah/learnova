import { Schema, model, Types, type InferSchemaType } from 'mongoose';

const notificationSchema = new Schema(
  {
    tenantId: { type: Types.ObjectId, ref: 'Tenant', required: true, index: true },
    userId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    channel: { type: String, enum: ['in_app', 'email', 'sms', 'push'], default: 'in_app' },
    type: String,
    title: String,
    body: String,
    readAt: Date,
    sentAt: Date,
  },
  { timestamps: true },
);
notificationSchema.index({ userId: 1, readAt: 1 });
export type Notification = InferSchemaType<typeof notificationSchema>;
export const NotificationModel = model('Notification', notificationSchema);
