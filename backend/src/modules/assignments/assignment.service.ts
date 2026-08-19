import { Types } from 'mongoose';
import { NotFoundError } from '../../core/errors.js';
import { bus } from '../../core/eventBus.js';
import { AssignmentModel } from './assignment.model.js';
import { agentSystem } from '../../agents/index.js';

export const assignmentService = {
  async submit(tenantId: string, studentId: string, data: { title: string; subject?: string; fileUrls?: string[]; excerpt?: string }) {
    const a = await AssignmentModel.create({
      tenantId: new Types.ObjectId(tenantId), studentId: new Types.ObjectId(studentId),
      title: data.title, subject: data.subject, fileUrls: data.fileUrls ?? [], status: 'submitted',
    });
    // Run the Assessment Agent inline so the student gets feedback immediately,
    // and also publish the event for any other interested consumers.
    const review = await agentSystem.supervisor.route('review_assignment', {
      input: { title: data.title, subject: data.subject, excerpt: data.excerpt },
    });
    a.aiReview = review;
    a.status = 'ai_reviewed';
    await a.save();
    await bus.publish('assignment.reviewed', { assignmentId: String(a._id), studentId }, { tenantId });
    return a;
  },

  list(tenantId: string, studentId: string) {
    return AssignmentModel.find({ tenantId, studentId }).sort({ createdAt: -1 });
  },

  async get(tenantId: string, id: string) {
    const a = await AssignmentModel.findOne({ _id: id, tenantId });
    if (!a) throw new NotFoundError('Assignment not found');
    return a;
  },

  async grade(tenantId: string, id: string, graderId: string, value: number) {
    const a = await AssignmentModel.findOneAndUpdate(
      { _id: id, tenantId },
      { status: 'graded', grade: { value, gradedBy: new Types.ObjectId(graderId), gradedAt: new Date() } },
      { new: true },
    );
    if (!a) throw new NotFoundError('Assignment not found');
    return a;
  },
};
