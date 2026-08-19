import crypto from 'node:crypto';
import { config } from '../../../config/index.js';

const BASE = 'https://api.paystack.co';

export const paystack = {
  async initialize(args: { email: string; amountGHS: number; reference: string; metadata?: unknown; callbackUrl?: string; plan?: string }) {
    const res = await fetch(`${BASE}/transaction/initialize`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.payments.paystackSecret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: args.email,
        amount: Math.round(args.amountGHS * 100),
        currency: 'GHS',
        reference: args.reference,
        metadata: args.metadata,
        callback_url: args.callbackUrl,
        // When a plan code is supplied, Paystack creates a recurring subscription automatically.
        ...(args.plan ? { plan: args.plan } : {}),
      }),
    });
    return res.json() as Promise<{ data?: { authorization_url: string } }>;
  },
  /** Create a recurring plan on Paystack (one-time setup). interval: monthly | annually | weekly. */
  async createPlan(args: { name: string; amountGHS: number; interval?: string }) {
    const res = await fetch(`${BASE}/plan`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.payments.paystackSecret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: args.name, amount: Math.round(args.amountGHS * 100), interval: args.interval ?? 'monthly', currency: 'GHS' }),
    });
    return res.json() as Promise<{ status: boolean; data?: { plan_code: string } }>;
  },
  /** Disable a recurring subscription (requires the subscription code + email token). */
  async disableSubscription(code: string, token: string) {
    const res = await fetch(`${BASE}/subscription/disable`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.payments.paystackSecret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, token }),
    });
    return res.json() as Promise<{ status: boolean }>;
  },
  async verify(reference: string) {
    const res = await fetch(`${BASE}/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${config.payments.paystackSecret}` },
    });
    return res.json() as Promise<{ data?: { status: string } }>;
  },
  verifyWebhook(rawBody: Buffer | string, signature: string): boolean {
    const hash = crypto.createHmac('sha512', config.payments.paystackSecret).update(rawBody).digest('hex');
    return hash === signature;
  },
};
