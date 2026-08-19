import { Router } from 'express';
import { z } from 'zod';
import crypto from 'node:crypto';
import { Types } from 'mongoose';
import { asyncHandler, ok } from '../../core/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { SubscriptionModel, PLANS } from './subscription.model.js';
import { paystack } from '../payments/providers/paystack.js';
import { config } from '../../config/index.js';
import { UserModel } from '../users/user.model.js';

export const subscriptionRoutes = Router();
subscriptionRoutes.use(requireAuth);

subscriptionRoutes.get('/plans', asyncHandler(async (_req, res) => ok(res, PLANS)));

subscriptionRoutes.get('/me', asyncHandler(async (req, res) => {
  const sub = await SubscriptionModel.findOne({ tenantId: req.user!.tenantId, userId: req.user!.id });
  ok(res, sub ?? { plan: 'free', status: 'active' });
}));

// Subscribe to a paid plan. Initializes Paystack checkout (or dev-activates without a key).
subscriptionRoutes.post('/subscribe', validate(z.object({ plan: z.enum(['pro', 'premium']) })), asyncHandler(async (req, res) => {
  const plan = PLANS.find((p) => p.id === req.body.plan)!;
  // Launch promo: everyone's first year is free — activate without any charge.
  if (config.payments.freeYear) {
    const existing = await SubscriptionModel.findOne({ tenantId: req.user!.tenantId, userId: req.user!.id });
    if (!existing?.promoUsed) {
      const sub = await SubscriptionModel.findOneAndUpdate(
        { tenantId: req.user!.tenantId, userId: req.user!.id },
        { tenantId: new Types.ObjectId(req.user!.tenantId), userId: new Types.ObjectId(req.user!.id),
          plan: plan.id, interval: 'yearly', status: 'active', promoUsed: true,
          currentPeriodEnd: new Date(Date.now() + 365 * 864e5) },
        { upsert: true, new: true },
      );
      ok(res, { freeYear: true, subscription: sub, message: 'Your first year is on us — enjoy ' + plan.name + ' free for 12 months!' });
      return;
    }
  }
  const reference = `sub_${req.user!.id}_${crypto.randomBytes(4).toString('hex')}`;
  const periodEnd = new Date(Date.now() + 30 * 864e5);

  if (!config.payments.paystackSecret) {
    const sub = await SubscriptionModel.findOneAndUpdate(
      { tenantId: req.user!.tenantId, userId: req.user!.id },
      { tenantId: new Types.ObjectId(req.user!.tenantId), userId: new Types.ObjectId(req.user!.id), plan: plan.id, status: 'active', currentPeriodEnd: periodEnd, reference },
      { upsert: true, new: true },
    );
    ok(res, { dev: true, subscription: sub, message: 'Dev mode: activated. Set PAYSTACK_SECRET_KEY for live recurring billing.' });
    return;
  }
  const payer = await UserModel.findById(req.user!.id).select('email');
  const planCode = config.payments.planCodes?.[plan.id];
  const init = await paystack.initialize({
    email: payer?.email ?? 'payer@learnova.dev', amountGHS: plan.priceGHS, reference,
    metadata: { kind: 'subscription', plan: plan.id, userId: req.user!.id, tenantId: req.user!.tenantId },
    callbackUrl: `${config.corsOrigin}/billing?ref=${reference}`,
    // If a recurring plan code is configured, Paystack auto-creates a subscription that renews on its own.
    ...(planCode ? { plan: planCode } : {}),
  });
  // Record as past_due until the payment is verified (via callback/webhook).
  await SubscriptionModel.findOneAndUpdate(
    { tenantId: req.user!.tenantId, userId: req.user!.id },
    { tenantId: new Types.ObjectId(req.user!.tenantId), userId: new Types.ObjectId(req.user!.id), plan: plan.id, status: 'past_due', currentPeriodEnd: periodEnd, reference },
    { upsert: true },
  );
  ok(res, { authorizationUrl: init.data?.authorization_url, reference });
}));

// Verify a subscription payment (callback) → activate.
subscriptionRoutes.get('/verify/:reference', asyncHandler(async (req, res) => {
  let success = true;
  if (config.payments.paystackSecret) { const v = await paystack.verify(req.params.reference); success = v.data?.status === 'success'; }
  if (success) await SubscriptionModel.updateOne({ tenantId: req.user!.tenantId, userId: req.user!.id, reference: req.params.reference }, { $set: { status: 'active' } });
  ok(res, { status: success ? 'active' : 'pending' });
}));

subscriptionRoutes.post('/cancel', asyncHandler(async (req, res) => {
  const sub = await SubscriptionModel.findOne({ tenantId: req.user!.tenantId, userId: req.user!.id });
  // Stop the recurring charge at Paystack if we have the subscription handle.
  if (sub?.paystackCode && sub?.paystackToken && config.payments.paystackSecret) {
    try { await paystack.disableSubscription(sub.paystackCode, sub.paystackToken); } catch { /* best-effort */ }
  }
  await SubscriptionModel.updateOne({ tenantId: req.user!.tenantId, userId: req.user!.id }, { $set: { status: 'cancelled', plan: 'free' } });
  ok(res, { cancelled: true });
}));

// ---- One-time admin setup: create the recurring plans on Paystack ----
subscriptionRoutes.post('/setup-plans', requireRole('super_admin', 'school_admin'), asyncHandler(async (_req, res) => {
  if (!config.payments.paystackSecret) { res.status(400).json({ error: 'Set PAYSTACK_SECRET_KEY first.' }); return; }
  const out: Record<string, string> = {};
  for (const p of PLANS) {
    if (p.priceGHS === 0) continue;
    const monthly = await paystack.createPlan({ name: `Learnova ${p.name} (Monthly)`, amountGHS: p.priceGHS, interval: 'monthly' });
    if (monthly.data?.plan_code) out[`${p.id}_monthly`] = monthly.data.plan_code;
    const yearly = await paystack.createPlan({ name: `Learnova ${p.name} (Yearly)`, amountGHS: p.priceYearlyGHS, interval: 'annually' });
    if (yearly.data?.plan_code) out[`${p.id}_yearly`] = yearly.data.plan_code;
  }
  ok(res, { planCodes: out, next: 'Set PAYSTACK_PLAN_PRO_MONTHLY, PAYSTACK_PLAN_PRO_YEARLY, PAYSTACK_PLAN_PREMIUM_MONTHLY, PAYSTACK_PLAN_PREMIUM_YEARLY to these codes, then redeploy.' });
}));
