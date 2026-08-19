import { Router } from 'express';
import { asyncHandler } from '../../core/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { paymentController } from './payment.controller.js';
import { z } from 'zod';
import crypto from 'node:crypto';
import { ok } from '../../core/http.js';
import { validate } from '../../middleware/validate.js';
import { paystack } from './providers/paystack.js';
import { config } from '../../config/index.js';
import { FeeInvoiceModel } from '../tenants/school.models.js';
import { UserModel } from '../users/user.model.js';
import { WithdrawalModel } from './withdrawal.model.js';
import { LedgerModel } from './ledger.model.js';
import { paymentService } from './payment.service.js';
import { requireRole } from '../../middleware/rbac.js';

export const paymentRoutes = Router();
// Webhook is public but signature-verified.
paymentRoutes.post('/webhooks/paystack', asyncHandler(paymentController.paystackWebhook));
paymentRoutes.get('/balance', requireAuth, requireRole('teacher'), asyncHandler(paymentController.balance));

// Initialize a Paystack checkout for a fee invoice. Returns an authorization URL to redirect to.
paymentRoutes.post('/initialize', requireAuth, validate(z.object({ invoiceId: z.string() })), asyncHandler(async (req, res) => {
  const invoice = await FeeInvoiceModel.findOne({ _id: req.body.invoiceId, tenantId: req.user!.tenantId });
  if (!invoice) { res.status(404).json({ error: 'Invoice not found' }); return; }
  if (invoice.status === 'paid') { ok(res, { status: 'paid', alreadyPaid: true }); return; }

  const reference = `inv_${invoice._id}_${crypto.randomBytes(4).toString('hex')}`;
  const payer = await UserModel.findById(req.user!.id).select('email');
  const email = payer?.email ?? 'payer@learnova.dev';

  if (!config.payments.paystackSecret) {
    // No live key configured — return a dev reference the verify step can still settle.
    ok(res, { dev: true, reference, message: 'Set PAYSTACK_SECRET_KEY to redirect to live checkout. Use /payments/verify to simulate success.' });
    return;
  }
  const init = await paystack.initialize({
    email, amountGHS: invoice.amountGHS, reference,
    metadata: { invoiceId: String(invoice._id), kind: 'fee' },
    callbackUrl: `${config.corsOrigin}/payments/callback`,
  });
  ok(res, { authorizationUrl: init.data?.authorization_url, reference });
}));

// Verify a Paystack transaction (callback / polling) and mark the invoice paid on success.
paymentRoutes.get('/verify/:reference', requireAuth, asyncHandler(async (req, res) => {
  const reference = req.params.reference;
  const invoiceId = reference.split('_')[1];
  let success = false;
  if (config.payments.paystackSecret) {
    const v = await paystack.verify(reference);
    success = v.data?.status === 'success';
  } else {
    success = true; // dev mode: treat as paid so the flow is demoable end-to-end
  }
  if (success && invoiceId) {
    await FeeInvoiceModel.updateOne({ _id: invoiceId, tenantId: req.user!.tenantId }, { $set: { status: 'paid', paidAt: new Date() } });
  }
  ok(res, { status: success ? 'paid' : 'pending' });
}));

// ---- Peer-tutor / tutor payouts ----
// Request a withdrawal against the ledger balance; reserves the amount with a DEBIT entry.
paymentRoutes.post('/withdrawals', requireAuth, requireRole('teacher', 'student'), validate(z.object({
  amountGHS: z.number().positive(), method: z.enum(['mtn_momo', 'bank', 'telecel', 'airteltigo']).optional(), destination: z.string().min(5),
})), asyncHandler(async (req, res) => {
  const account = `teacher:${req.user!.id}`;                 // peer tutors are tutors in the ledger
  const balance = await paymentService.balanceOf(req.user!.tenantId, account);
  if (req.body.amountGHS > balance) { res.status(400).json({ error: `Insufficient balance (₵${balance} available).` }); return; }

  const w = await WithdrawalModel.create({
    tenantId: req.user!.tenantId, userId: req.user!.id, amountGHS: req.body.amountGHS,
    method: req.body.method ?? 'mtn_momo', destination: req.body.destination, status: 'pending',
  });
  await LedgerModel.create({ tenantId: req.user!.tenantId, account, type: 'DEBIT', amountGHS: req.body.amountGHS, memo: `withdrawal:${w._id}` });
  ok(res, { withdrawal: w, balanceAfter: await paymentService.balanceOf(req.user!.tenantId, account) }, undefined, 201);
}));

paymentRoutes.get('/withdrawals', requireAuth, asyncHandler(async (req, res) => {
  ok(res, await WithdrawalModel.find({ tenantId: req.user!.tenantId, userId: req.user!.id }).sort('-createdAt'));
}));

// Finance/admin marks a payout paid or rejected (rejection refunds the reserved amount).
paymentRoutes.patch('/withdrawals/:id', requireAuth, requireRole('school_admin', 'super_admin'), validate(z.object({ status: z.enum(['paid', 'rejected']) })), asyncHandler(async (req, res) => {
  const w = await WithdrawalModel.findOne({ _id: req.params.id, tenantId: req.user!.tenantId });
  if (!w) { res.status(404).json({ error: 'Not found' }); return; }
  if (w.status !== 'pending') { ok(res, w); return; }
  w.status = req.body.status; w.processedAt = new Date(); await w.save();
  if (req.body.status === 'rejected') {
    await LedgerModel.create({ tenantId: w.tenantId, account: `teacher:${w.userId}`, type: 'CREDIT', amountGHS: w.amountGHS, memo: `withdrawal-refund:${w._id}` });
  }
  ok(res, w);
}));
