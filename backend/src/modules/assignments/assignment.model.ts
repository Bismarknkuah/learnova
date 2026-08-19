import { Schema, model, Types, type InferSchemaType } from 'mongoose';

const assignmentSchema = new Schema(
  {
    tenantId: { type: Types.ObjectId, ref: 'Tenant', required: true, index: true },
    studentId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    tutorId: { type: Types.ObjectId, ref: 'Tutor' },
    title: { type: String, required: true },
    subject: String,
    fileUrls: [String],                    // uploaded PDFs/images/docs
    status: { type: String, enum: ['submitted', 'ai_reviewed', 'graded'], default: 'submitted', index: true },
    aiReview: {
      score: Number,
      feedback: String,
      hints: [String],
      plagiarismScore: Number,
    },
    grade: { value: Number, gradedBy: { type: Types.ObjectId, ref: 'User' }, gradedAt: Date },
  },
  { timestamps: true },
);
export type Assignment = InferSchemaType<typeof assignmentSchema>;
export const AssignmentModel = model('Assignment', assignmentSchema);
