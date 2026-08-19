import { ConflictError, NotFoundError } from '../../core/errors.js';
import { bus } from '../../core/eventBus.js';
import { bookingRepository } from './booking.repository.js';
import { tutorRepository } from '../tutors/tutor.repository.js';
import { paymentService } from '../payments/payment.service.js';

export const bookingService = {
  /** Create a booking, guarding against double-booking, then start payment. */
  async create(tenantId: string, studentId: string, input: {
    tutorId: string; type: string; startAt: Date; endAt: Date;
  }) {
    const tutor = await tutorRepository.findById(tenantId, input.tutorId);
    if (!tutor) throw new NotFoundError('Tutor not found');

    const clashes = await bookingRepository.overlapping(tenantId, input.tutorId, input.startAt, input.endAt);
    if (clashes.length) throw new ConflictError('Tutor is not available for that slot');

    const hours = (input.endAt.getTime() - input.startAt.getTime()) / 3_600_000;
    const priceGHS = Math.round(tutor.hourlyRateGHS * hours * 100) / 100;

    const booking = await bookingRepository.create(tenantId, {
      studentId: studentId as never,
      tutorId: input.tutorId as never,
      type: input.type as never,
      startAt: input.startAt,
      endAt: input.endAt,
      priceGHS,
      status: 'pending_payment',
    });

    const payment = await paymentService.initiate(tenantId, {
      bookingId: String(booking._id),
      studentId,
      tutorUserId: String(tutor.userId),
      amountGHS: priceGHS,
    });

    await bus.publish('booking.created', { bookingId: String(booking._id), priceGHS }, { tenantId });
    return { booking, payment };
  },

  async confirmPaid(tenantId: string, bookingId: string, paymentId: string) {
    const booking = await bookingRepository.setStatus(tenantId, bookingId, 'confirmed', {
      paymentId: paymentId as never,
    });
    if (!booking) throw new NotFoundError('Booking not found');
    await bus.publish('booking.confirmed', { bookingId }, { tenantId });
    return booking;
  },

  list(tenantId: string, userId: string) {
    return bookingRepository.listForUser(tenantId, userId);
  },
};
