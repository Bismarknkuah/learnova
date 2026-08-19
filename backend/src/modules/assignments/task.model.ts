import { Schema, model, Types, type InferSchemaType } from 'mongoose';

/** A free-text / essay assignment set by a teacher for students to complete. */
const taskSchema = new Schema({
  tenantId: { type: Types.ObjectId, ref: 'Tenant', required: true, index: true },
  tutorId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
  tutorName: String,
  title: { type: String, required: true },
  instructions: { type: String, required: true },
  subject: String,
  level: { type: String, default: 'Any' },
  dueDate: Date,
  maxScore: { type: Number, default: 100 },
  status: { type: String, enum: ['open', 'closed'], default: 'open', index: true },
}, { timestamps: true });
export type AssignmentTask = InferSchemaType<typeof taskSchema>;
export const AssignmentTaskModel = model('AssignmentTask', taskSchema);

/** A student's written submission to a task, with the teacher's grade & feedback. */
const submissionSchema = new Schema({
  tenantId: { type: Types.ObjectId, ref: 'Tenant', required: true, index: true },
  taskId: { type: Types.ObjectId, ref: 'AssignmentTask', required: true, index: true },
  studentId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
  studentName: String,
  text: { type: String, required: true },
  status: { type: String, enum: ['submitted', 'graded'], default: 'submitted', index: true },
  grade: { value: Number, feedback: String, gradedBy: { type: Types.ObjectId, ref: 'User' }, gradedAt: Date },
}, { timestamps: true });
submissionSchema.index({ taskId: 1, studentId: 1 }, { unique: true });
export type TaskSubmission = InferSchemaType<typeof submissionSchema>;
export const TaskSubmissionModel = model('TaskSubmission', submissionSchema);
