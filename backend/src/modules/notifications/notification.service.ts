import { Types } from 'mongoose';
import { bus } from '../../core/eventBus.js';
import { logger } from '../../core/logger.js';
import { NotificationModel } from './notification.model.js';

async function create(tenantId: string, userId: string, type: string, title: string, body: string) {
  if (!tenantId || !userId) return;
  await NotificationModel.create({
    tenantId: new Types.ObjectId(tenantId), userId: new Types.ObjectId(userId),
    channel: 'in_app', type, title, body, sentAt: new Date(),
  });
}

/**
 * Subscribes to domain events and turns them into in-app notifications.
 * This is how modules stay decoupled: bookings/payments/assignments just publish events;
 * notifications reacts. Add email/SMS/push fan-out here later (channel field already exists).
 */
export function startNotificationConsumers(): void {
  bus.subscribe('booking.confirmed', async (e) => {
    const { studentId } = (e.payload as { studentId?: string });
    if (e.meta.tenantId && studentId) {
      await create(e.meta.tenantId, studentId, 'booking', 'Booking confirmed', 'Your session is booked.');
    }
  });

  bus.subscribe('payment.succeeded', async (e) => {
    const p = e.payload as { teacherEarnings?: number };
    logger.debug({ teacherEarnings: p.teacherEarnings }, 'notify: payment settled');
  });

  bus.subscribe('assignment.reviewed', async (e) => {
    const { studentId } = (e.payload as { studentId?: string });
    if (e.meta.tenantId && studentId) {
      await create(e.meta.tenantId, studentId, 'assignment', 'Assignment reviewed', 'AI feedback is ready.');
    }
  });

  logger.info('notification consumers started');
}
