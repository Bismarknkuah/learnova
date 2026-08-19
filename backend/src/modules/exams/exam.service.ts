import { Types } from 'mongoose';
import { NotFoundError, ForbiddenError } from '../../core/errors.js';
import { bus } from '../../core/eventBus.js';
import { ExamModel, AttemptModel } from './exam.model.js';

interface ProctorEvent { type: string; at: string; severity: 'low' | 'medium' | 'high' }
const RISK = { low: 1, medium: 3, high: 6 };

export const examService = {
  create(tenantId: string, createdBy: string, data: Record<string, unknown>) {
    return ExamModel.create({ ...data, tenantId: new Types.ObjectId(tenantId), createdBy: new Types.ObjectId(createdBy) });
  },

  list(tenantId: string, track?: string) {
    const filter: Record<string, unknown> = { tenantId };
    if (track) filter.track = track;
    return ExamModel.find(filter).select('-questions.answerIndex'); // never leak answers
  },

  async start(tenantId: string, examId: string, studentId: string) {
    const exam = await ExamModel.findOne({ _id: examId, tenantId });
    if (!exam) throw new NotFoundError('Exam not found');
    const attempt = await AttemptModel.create({
      tenantId: new Types.ObjectId(tenantId), examId: exam._id, studentId: new Types.ObjectId(studentId),
      startedAt: new Date(), answers: [],
    });
    return { attemptId: String(attempt._id), durationMin: exam.durationMin, questions: exam.questions.map((q) => ({ prompt: q.prompt, options: q.options })) };
  },

  /** Submit answers; auto-grade; fold proctor events into a risk score. */
  async submit(tenantId: string, attemptId: string, studentId: string, answers: number[], proctorEvents: ProctorEvent[] = []) {
    const attempt = await AttemptModel.findOne({ _id: attemptId, tenantId, studentId });
    if (!attempt) throw new NotFoundError('Attempt not found');
    if (attempt.submittedAt) throw new ForbiddenError('Attempt already submitted');

    const exam = await ExamModel.findById(attempt.examId);
    if (!exam) throw new NotFoundError('Exam not found');

    let score = 0;
    const concepts: { concept: string; correct: boolean; subject?: string }[] = [];
    exam.questions.forEach((q, i) => {
      const correct = answers[i] === q.answerIndex;
      if (correct) score += q.marks ?? 1;
      if (q.topic) concepts.push({ concept: q.topic, correct, subject: exam.subject ?? undefined });
    });
    const maxScore = exam.questions.reduce((s, q) => s + (q.marks ?? 1), 0) || 1;
    const pct = Math.round((score / maxScore) * 100);

    const riskScore = proctorEvents.reduce((s, e) => s + (RISK[e.severity] ?? 1), 0);

    attempt.answers = answers;
    attempt.score = pct;
    attempt.submittedAt = new Date();
    attempt.proctorEvents = proctorEvents.map((e) => ({ type: e.type, at: new Date(e.at), severity: e.severity })) as never;
    attempt.riskScore = riskScore;
    await attempt.save();

    await bus.publish('exam.submitted', { attemptId, examId: String(exam._id), studentId, score: pct, riskScore, concepts }, { tenantId });
    return { score: pct, riskScore, flagged: riskScore >= 6 };
  },
};
