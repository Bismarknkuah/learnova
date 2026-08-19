import { Schema, model, Types, type InferSchemaType } from 'mongoose';

/** A virtual lab definition (e.g. a logic-circuit or physics experiment) + saved attempts. */
const labSchema = new Schema({
  tenantId: { type: Types.ObjectId, ref: 'Tenant', required: true, index: true },
  kind: { type: String, enum: ['logic_circuit', 'electronics', 'physics', 'networking', 'chemistry'], required: true, index: true },
  title: { type: String, required: true },
  subject: String,
  brief: String,
  config: Schema.Types.Mixed,        // starting components/goal for the simulator
  createdBy: { type: Types.ObjectId, ref: 'User' },
}, { timestamps: true });

const labSessionSchema = new Schema({
  tenantId: { type: Types.ObjectId, ref: 'Tenant', required: true, index: true },
  labId: { type: Types.ObjectId, ref: 'Lab', required: true, index: true },
  studentId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
  state: Schema.Types.Mixed,         // saved circuit graph / experiment state
  completed: { type: Boolean, default: false },
  score: Number,
}, { timestamps: true });

export type Lab = InferSchemaType<typeof labSchema>;
export type LabSession = InferSchemaType<typeof labSessionSchema>;
export const LabModel = model('Lab', labSchema);
export const LabSessionModel = model('LabSession', labSessionSchema);
