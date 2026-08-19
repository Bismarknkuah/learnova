import { Router } from 'express';
import { SessionModel } from './modules/classrooms/session.model.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { tutorRoutes } from './modules/tutors/tutor.routes.js';
import { bookingRoutes } from './modules/bookings/booking.routes.js';
import { paymentRoutes } from './modules/payments/payment.routes.js';
import { aiRoutes } from './modules/ai/ai.routes.js';
import { assignmentRoutes } from './modules/assignments/assignment.routes.js';
import { examRoutes } from './modules/exams/exam.routes.js';
import { certificateRoutes } from './modules/certificates/certificate.routes.js';
import { classroomRoutes } from './modules/classrooms/session.routes.js';
import { notificationRoutes } from './modules/notifications/notification.routes.js';
import { userRoutes } from './modules/users/user.routes.js';
import { schoolRoutes } from './modules/tenants/school.routes.js';
import { parentRoutes } from './modules/tenants/parent.routes.js';
import { portfolioRoutes } from './modules/portfolio/portfolio.routes.js';
import { feedRoutes } from './modules/feed/feed.routes.js';
import { messagingRoutes } from './modules/messaging/messaging.routes.js';
import { subscriptionRoutes } from './modules/subscriptions/subscription.routes.js';
import { brandingRoutes } from './modules/tenants/branding.routes.js';
import { adaptiveRoutes } from './modules/adaptive/adaptive.routes.js';
import { marketplaceRoutes } from './modules/marketplace/marketplace.routes.js';
import { gamificationRoutes } from './modules/gamification/gamification.routes.js';
import { careerRoutes } from './modules/career/career.routes.js';
import { communityRoutes } from './modules/community/community.routes.js';
import { libraryRoutes } from './modules/library/library.routes.js';
import { scholarshipRoutes } from './modules/scholarships/scholarship.routes.js';
import { labRoutes } from './modules/labs/lab.routes.js';
import { syncRoutes } from './modules/sync/sync.routes.js';
import { adminRoutes } from './modules/admin/admin.routes.js';
import { inviteRoutes } from './modules/invites/invite.routes.js';

/** Single place that mounts every module router under /api/v1. */
export const apiRouter = Router();

// Public (no-auth) endpoints for the marketing site.
const publicRouter = Router();
publicRouter.get('/classes', async (_req, res) => {
  try {
    const sessions = await SessionModel.find({ status: { $in: ['scheduled', 'live'] } })
      .sort({ createdAt: -1 }).limit(6)
      .select('title hostName level priceGHS status subject createdAt');
    res.json({ data: sessions });
  } catch { res.json({ data: [] }); }
});
apiRouter.use('/public', publicRouter);

apiRouter.use('/auth', authRoutes);
apiRouter.use('/tutors', tutorRoutes);
apiRouter.use('/bookings', bookingRoutes);
apiRouter.use('/payments', paymentRoutes);
apiRouter.use('/ai', aiRoutes);
apiRouter.use('/assignments', assignmentRoutes);
apiRouter.use('/exams', examRoutes);
apiRouter.use('/certificates', certificateRoutes);
apiRouter.use('/classrooms', classroomRoutes);
apiRouter.use('/notifications', notificationRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/schools', schoolRoutes);
apiRouter.use('/parent', parentRoutes);
apiRouter.use('/portfolio', portfolioRoutes);
apiRouter.use('/feed', feedRoutes);
apiRouter.use('/messages', messagingRoutes);
apiRouter.use('/subscriptions', subscriptionRoutes);
apiRouter.use('/branding', brandingRoutes);
apiRouter.use('/adaptive', adaptiveRoutes);
apiRouter.use('/marketplace', marketplaceRoutes);
apiRouter.use('/gamification', gamificationRoutes);
apiRouter.use('/career', careerRoutes);
apiRouter.use('/community', communityRoutes);
apiRouter.use('/library', libraryRoutes);
apiRouter.use('/scholarships', scholarshipRoutes);
apiRouter.use('/labs', labRoutes);
apiRouter.use('/sync', syncRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/invites', inviteRoutes);
