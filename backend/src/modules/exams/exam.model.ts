import { Schema, model, Types, type InferSchemaType } from 'mongoose';

const questionSchema = new Schema(
  { prompt: String, options: [String], answerIndex: Number, topic: String, marks: { type: Number, default: 1 } },
  { _id: false },
);

const examSchema = new Schema(
  {
    tenantId: { type: Types.ObjectId, ref: 'Tenant', required: true, index: true },
    track: { type: String, enum: ['BECE', 'WASSCE', 'GRE', 'SAT', 'IELTS', 'TOEFL', 'custom'], index: true },
    subject: String,
    title: { type: String, required: true },
    durationMin: { type: Number, default: 60 },
    questions: [questionSchema],
    proctored: { type: Boolean, default: false },
    createdBy: { type: Types.ObjectId, ref: 'User' },
    aiGenerated: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const attemptSchema = new Schema(
  {
    tenantId: { type: Types.ObjectId, ref: 'Tenant', required: true, index: true },
    examId: { type: Types.ObjectId, ref: 'Exam', required: true, index: true },
    studentId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    answers: [Number],
    score: Number,
    startedAt: Date,
    submittedAt: Date,
    proctorEvents: [{ type: { type: String }, at: Date, severity: String }], // tab-switch, multi-face...
    riskScore: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export type Exam = InferSchemaType<typeof examSchema>;
export const ExamModel = model('Exam', examSchema);
export const AttemptModel = model('ExamAttempt', attemptSchema);
