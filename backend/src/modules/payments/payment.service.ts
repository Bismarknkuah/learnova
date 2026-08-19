import { Types } from 'mongoose';
import { config } from '../../config/index.js';
import { NotFoundError } from '../../core/errors.js';
import { bus } from '../../core/eventBus.js';
import { PaymentModel } from './payment.model.js';
import { LedgerModel } from './ledger.model.js';
import { paystack } from './providers/paystack.js';
import { splitPayment } from './split.js';
import { UserModel } from '../users/user.model.js';

const round2 = (n: number) => Math.round(n * 100) / 100;
const ref = () => 'lv_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export const paymentService = {
  /** Create a pending payment and a Paystack authorization URL (idempotent via reference). */
  async initiate(tenantId: string, args: {
    bookingId: string; studentId: string; tutorUserId: string; amountGHS: number;
  }) {
    const student = await UserModel.findById(args.studentId);
    const reference = ref();
    const init = await paystack.initialize({
      email: student?.email ?? `${args.studentId}@learnova.local`,
      amountGHS: args.amountGHS,
      reference,
      metadata: { bookingId: args.bookingId, tenantId },
    });

    const payment = await PaymentModel.create({
      tenantId: new Types.ObjectId(tenantId),
      bookingId: args.bookingId,
      studentId: args.studentId,
      tutorUserId: args.tutorUserId,
      provider: 'paystack',
      reference,
      amountGHS: args.amountGHS,
      status: 'pending',
      authorizationUrl: init.data?.authorization_url,
    });
    return payment;
  },

  /** Mark succeeded and post the commission split to the append-only ledger. */
  async markSucceeded(reference: string) {
    const payment = await PaymentModel.findOne({ reference });
    if (!payment) throw new NotFoundError('Payment not found');
    if (payment.status === 'succeeded') return payment; // idempotent

    payment.status = 'succeeded';
    await payment.save();

    const { commissionGHS: commission, teacherEarningsGHS: teacherEarnings } =
      splitPayment(payment.amountGHS, config.payments.commissionRate);

    await LedgerModel.insertMany([
      { tenantId: payment.tenantId, account: 'platform_revenue', type: 'CREDIT', amountGHS: commission, paymentId: payment._id, memo: 'commission' },
      { tenantId: payment.tenantId, account: `teacher:${payment.tutorUserId}`, type: 'CREDIT', amountGHS: teacherEarnings, paymentId: payment._id },
      { tenantId: payment.tenantId, account: `student:${payment.studentId}`, type: 'DEBIT', amountGHS: payment.amountGHS, paymentId: payment._id },
    ]);

    await bus.publish('payment.succeeded', {
      paymentId: String(payment._id),
      bookingId: String(payment.bookingId),
      amountGHS: payment.amountGHS,
      teacherEarnings, commission,
    }, { tenantId: String(payment.tenantId) });

    return payment;
  },

  /** Derive any account balance from the ledger. */
  async balanceOf(tenantId: string, account: string) {
    const entries = await LedgerModel.find({ tenantId, account });
    const bal = entries.reduce((s, e) => s + (e.type === 'CREDIT' ? e.amountGHS : -e.amountGHS), 0);
    return round2(bal);
  },
};
