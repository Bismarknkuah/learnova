import { Schema, model, Types, type InferSchemaType, type HydratedDocument } from 'mongoose';

const sessionSchema = new Schema(
  {
    tenantId: { type: Types.ObjectId, ref: 'Tenant', required: true, index: true },
    bookingId: { type: Types.ObjectId, ref: 'Booking', index: true },
    tutorId: { type: Types.ObjectId, ref: 'Tutor', required: true },
    title: String,
    hostName: String,
    priceGHS: { type: Number, default: 0 },
    isPeer: { type: Boolean, default: false },
    subject: String,
    level: { type: String, default: 'Any' },
    programme: String,
    status: { type: String, enum: ['scheduled', 'live', 'ended'], default: 'scheduled', index: true },
    sfuRoom: String,                       // LiveKit room name

    // Recording (LiveKit Egress)
    recording: {
      egressId: String,
      status: { type: String, enum: ['none', 'recording', 'processing', 'ready'], default: 'none' },
      url: String,
    },

    // AI Class Assistant artifacts
    transcript: { url: String, text: String },
    aiSummary: String,
    keyPoints: [String],
    chapters: [{ title: String, atMs: Number }],
    unansweredQuestions: [String],

    participants: [{ userId: Types.ObjectId, joinedAt: Date, leftAt: Date }],
    attendees: [{ userId: { type: Types.ObjectId, ref: 'User' }, name: String, joinedAt: Date, method: { type: String, default: 'activity' } }],
    startedAt: Date,
    endedAt: Date,
  },
  { timestamps: true },
);

export type Session = InferSchemaType<typeof sessionSchema>;
export type SessionDoc = HydratedDocument<Session>;
export const SessionModel = model('Session', sessionSchema);
