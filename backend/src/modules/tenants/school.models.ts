import { Schema, model, Types, type InferSchemaType } from 'mongoose';

const base = () => ({ tenantId: { type: Types.ObjectId, ref: 'Tenant', required: true, index: true } });

/** Academic Management — departments, courses. Administration — timetable, fees, results. */
const departmentSchema = new Schema({ ...base(), campus: String, name: { type: String, required: true }, head: String }, { timestamps: true });
const courseSchema = new Schema({ ...base(), department: String, code: { type: String, required: true }, title: { type: String, required: true }, credits: { type: Number, default: 3 }, teacherId: { type: Types.ObjectId, ref: 'User' } }, { timestamps: true });
const timetableSchema = new Schema({ ...base(), campus: String, courseTitle: { type: String, required: true }, day: { type: String, required: true }, startTime: { type: String, required: true }, endTime: { type: String, required: true }, room: String, teacher: String }, { timestamps: true });
const feeStructureSchema = new Schema({ ...base(), name: { type: String, required: true }, amountGHS: { type: Number, required: true }, term: String }, { timestamps: true });
const feeInvoiceSchema = new Schema({ ...base(), studentId: { type: Types.ObjectId, ref: 'User', required: true, index: true }, name: String, amountGHS: { type: Number, required: true }, status: { type: String, enum: ['unpaid', 'partial', 'paid'], default: 'unpaid' }, dueDate: Date, paidAt: Date }, { timestamps: true });
const resultSchema = new Schema({ ...base(), studentId: { type: Types.ObjectId, ref: 'User', required: true, index: true }, courseTitle: { type: String, required: true }, score: { type: Number, required: true }, grade: String, term: String }, { timestamps: true });

export const DepartmentModel = model('Department', departmentSchema);
export const CourseModel = model('Course', courseSchema);
export const TimetableModel = model('TimetableEntry', timetableSchema);
export const FeeStructureModel = model('FeeStructure', feeStructureSchema);
export const FeeInvoiceModel = model('FeeInvoice', feeInvoiceSchema);
export const ResultModel = model('Result', resultSchema);

export type Department = InferSchemaType<typeof departmentSchema>;
export type Course = InferSchemaType<typeof courseSchema>;
export type FeeInvoice = InferSchemaType<typeof feeInvoiceSchema>;
export type Result = InferSchemaType<typeof resultSchema>;

/** Letter grade from a percentage (WAEC-style banding). */
export function gradeFor(score: number): string {
  if (score >= 80) return 'A1'; if (score >= 75) return 'B2'; if (score >= 70) return 'B3';
  if (score >= 65) return 'C4'; if (score >= 60) return 'C5'; if (score >= 55) return 'C6';
  if (score >= 50) return 'D7'; if (score >= 45) return 'E8'; return 'F9';
}
