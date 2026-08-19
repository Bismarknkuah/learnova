import { Types } from 'mongoose';
import { BookingModel, type Booking } from './booking.model.js';

export const bookingRepository = {
  create(tenantId: string, data: Partial<Booking>) {
    return BookingModel.create({ ...data, tenantId: new Types.ObjectId(tenantId) });
  },
  findById(tenantId: string, id: string) {
    return BookingModel.findOne({ _id: id, tenantId, deletedAt: null });
  },
  setStatus(tenantId: string, id: string, status: Booking['status'], extra: Partial<Booking> = {}) {
    return BookingModel.findOneAndUpdate({ _id: id, tenantId }, { status, ...extra }, { new: true });
  },
  /** Existing bookings for a tutor that could clash with a window. */
  overlapping(tenantId: string, tutorId: string, start: Date, end: Date) {
    return BookingModel.find({
      tenantId, tutorId, deletedAt: null,
      status: { $in: ['confirmed', 'in_progress'] },
      startAt: { $lt: end }, endAt: { $gt: start },
    });
  },
  listForUser(tenantId: string, userId: string) {
    return BookingModel.find({ tenantId, studentId: userId, deletedAt: null }).sort({ startAt: -1 });
  },
};
