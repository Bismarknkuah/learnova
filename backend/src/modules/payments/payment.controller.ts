import type { Request, Response } from 'express';
import { ok } from '../../core/http.js';
import { paymentService } from './payment.service.js';
import { paystack } from './providers/paystack.js';
import { bookingService } from '../bookings/booking.service.js';
import { SubscriptionModel } from '../subscriptions/subscription.model.js';
import { UserModel } from '../users/user.model.js';
import { logger } from '../../core/logger.js';

export const paymentController = {
  /** Paystack webhook. Verify signature, then settle bookings AND drive subscription lifecycle. */
  async paystackWebhook(req: Request, res: Response) {
    const signature = req.headers['x-paystack-signature'] as string;
    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody ?? Buffer.from(JSON.stringify(req.body));
    if (!paystack.verifyWebhook(rawBody, signature)) {
      logger.warn('paystack webhook signature mismatch');
      res.sendStatus(401);
      return;
    }
    const event = req.body as {
      event: string;
      data: {
        reference?: string;
        subscription_code?: string; email_token?: string;
        status?: string;
        customer?: { email?: string };
        plan?: { plan_code?: string };
        metadata?: { kind?: string; plan?: string; bookingId?: string; tenantId?: string; userId?: string };
      };
    };
    const d = event.data;

    switch (event.event) {
      case 'charge.success': {
        const payment = await paymentService.markSucceeded(d.reference!);
        const meta = d.metadata;
        if (meta?.kind === 'subscription' && meta.tenantId && meta.userId) {
          // Activate / extend the subscription for another period on every successful (incl. recurring) charge.
          const end = new Date(Date.now() + 30 * 864e5);
          await SubscriptionModel.updateOne(
            { tenantId: meta.tenantId, userId: meta.userId },
            { $set: { status: 'active', currentPeriodEnd: end, ...(meta.plan ? { plan: meta.plan } : {}) } },
          );
        } else if (meta?.tenantId && meta?.bookingId) {
          await bookingService.confirmPaid(meta.tenantId, meta.bookingId, String(payment._id));
        }
        break;
      }
      case 'subscription.create': {
        // Persist the recurring handle so we can cancel later; match the user by email.
        if (d.customer?.email) {
          const user = await UserModel.findOne({ email: d.customer.email.toLowerCase() }).select('_id tenantId');
          if (user) await SubscriptionModel.updateOne(
            { userId: user._id },
            { $set: { status: 'active', paystackCode: d.subscription_code, paystackToken: d.email_token, paystackCustomer: d.customer.email } },
          );
        }
        break;
      }
      case 'invoice.payment_failed': {
        if (d.subscription_code) await SubscriptionModel.updateOne({ paystackCode: d.subscription_code }, { $set: { status: 'past_due' } });
        break;
      }
      case 'subscription.disable':
      case 'subscription.not_renew': {
        if (d.subscription_code) await SubscriptionModel.updateOne({ paystackCode: d.subscription_code }, { $set: { status: 'cancelled', plan: 'free' } });
        break;
      }
    }
    res.sendStatus(200);
  },

  async balance(req: Request, res: Response) {
    const account = `teacher:${req.user!.id}`;
    const balance = await paymentService.balanceOf(req.user!.tenantId, account);
    ok(res, { account, balanceGHS: balance });
  },
};
