import { Schema, model, Types, type InferSchemaType } from 'mongoose';

/** A user's subscription to a recurring plan. */
const subscriptionSchema = new Schema({
  tenantId: { type: Types.ObjectId, ref: 'Tenant', required: true, index: true },
  userId: { type: Types.ObjectId, ref: 'User', required: true, unique: true },
  plan: { type: String, enum: ['free', 'pro', 'premium'], default: 'free' },
  interval: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
  status: { type: String, enum: ['active', 'past_due', 'cancelled'], default: 'active', index: true },
  currentPeriodEnd: Date,
  provider: { type: String, default: 'paystack' },
  reference: String,
  paystackCode: String,        // Paystack subscription_code (for cancellation/renewal)
  paystackToken: String,       // email_token required to disable
  paystackCustomer: String,    // customer email/code
  promoUsed: { type: Boolean, default: false },   // first-year-free promo consumed
}, { timestamps: true });

export type Subscription = InferSchemaType<typeof subscriptionSchema>;
export const SubscriptionModel = model('Subscription', subscriptionSchema);

export const PLANS = [
  { id: 'free', name: 'Free', priceGHS: 0, priceYearlyGHS: 0, features: ['AI Companion (basic)', 'Community & library', 'Up to 3 bookings/mo'] },
  { id: 'pro', name: 'Pro', priceGHS: 5, priceYearlyGHS: 35, features: ['Unlimited AI tutor & Twin', 'Unlimited bookings', 'Exam prep generator', 'Priority tutor matching'] },
  { id: 'premium', name: 'Premium', priceGHS: 8, priceYearlyGHS: 45, features: ['Everything in Pro', 'Live 1:1 priority', 'Career + CV AI suite', 'Verified certificate priority'] },
] as const;
