import { Schema, model, Types, type InferSchemaType, type HydratedDocument } from 'mongoose';

const bookingSchema = new Schema(
  {
    tenantId: { type: Types.ObjectId, ref: 'Tenant', required: true, index: true },
    studentId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    tutorId: { type: Types.ObjectId, ref: 'Tutor', required: true, index: true },
    type: {
      type: String,
      enum: ['one_on_one', 'group', 'assignment_review', 'exam_prep'],
      default: 'one_on_one',
    },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    priceGHS: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending_payment', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'],
      default: 'pending_payment',
      index: true,
    },
    paymentId: { type: Types.ObjectId, ref: 'Payment' },
    sessionId: { type: Types.ObjectId, ref: 'Session' },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

bookingSchema.index({ tutorId: 1, startAt: 1 }); // for conflict checks

export type Booking = InferSchemaType<typeof bookingSchema>;
export type BookingDoc = HydratedDocument<Booking>;
export const BookingModel = model('Booking', bookingSchema);
