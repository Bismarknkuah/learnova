import { Types, type FilterQuery } from 'mongoose';
import { NotFoundError, ConflictError, ForbiddenError } from '../../core/errors.js';
import { bus } from '../../core/eventBus.js';
import { ProductModel, type Product } from './product.model.js';
import { PurchaseModel } from './purchase.model.js';
import { paymentService } from '../payments/payment.service.js';

export const marketplaceService = {
  createProduct(tenantId: string, sellerId: string, data: Partial<Product>) {
    return ProductModel.create({ ...data, tenantId: new Types.ObjectId(tenantId), sellerId: new Types.ObjectId(sellerId) });
  },

  async search(tenantId: string, q: { type?: string; subject?: string; max?: number; page?: number; limit?: number }) {
    const filter: FilterQuery<Product> = { tenantId, deletedAt: null, isPublished: true };
    if (q.type) filter.type = q.type;
    if (q.subject) filter.subject = q.subject;
    if (q.max) filter.priceGHS = { $lte: q.max };
    const page = Math.max(1, q.page ?? 1);
    const limit = Math.min(50, q.limit ?? 20);
    const [items, total] = await Promise.all([
      ProductModel.find(filter).select('-contentUrl').sort({ salesCount: -1, rating: -1 }).skip((page - 1) * limit).limit(limit),
      ProductModel.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  },

  /** Start a purchase: creates a payment; access is granted on payment.succeeded. */
  async purchase(tenantId: string, buyerId: string, productId: string) {
    const product = await ProductModel.findOne({ _id: productId, tenantId, isPublished: true });
    if (!product) throw new NotFoundError('Product not found');
    const existing = await PurchaseModel.findOne({ tenantId, buyerId, productId, status: 'completed' });
    if (existing) throw new ConflictError('Already purchased');

    // Apply a redeemed marketplace discount perk, if any.
    const profile = await GamificationModel.findOne({ tenantId, userId: buyerId }).select('perks');
    const discountPct = profile?.perks?.marketplaceDiscountPct ?? 0;
    const pricePaidGHS = Math.round(product.priceGHS * (1 - discountPct / 100) * 100) / 100;

    const purchase = await PurchaseModel.create({
      tenantId: new Types.ObjectId(tenantId), productId: product._id,
      buyerId: new Types.ObjectId(buyerId), pricePaidGHS, status: 'pending',
    });
    // Reuse the same payment flow as bookings; the seller is the "tutorUser" for the ledger split.
    const payment = await paymentService.initiate(tenantId, {
      bookingId: String(purchase._id), studentId: buyerId,
      tutorUserId: String(product.sellerId), amountGHS: pricePaidGHS,
    });
    return { purchase, payment };
  },

  /** Called when a marketplace payment settles (wired to payment.succeeded). */
  async completePurchase(tenantId: string, purchaseId: string, paymentId: string) {
    const purchase = await PurchaseModel.findOneAndUpdate(
      { _id: purchaseId, tenantId }, { status: 'completed', paymentId }, { new: true },
    );
    if (!purchase) return;
    await ProductModel.updateOne({ _id: purchase.productId }, { $inc: { salesCount: 1 } });
    await bus.publish('marketplace.purchased', { productId: String(purchase.productId), buyerId: String(purchase.buyerId) }, { tenantId });
  },

  /** Buyer's library — only purchased products include the contentUrl. */
  async library(tenantId: string, buyerId: string) {
    const purchases = await PurchaseModel.find({ tenantId, buyerId, status: 'completed' }).populate('productId');
    return purchases.map((p) => p.productId);
  },

  async download(tenantId: string, buyerId: string, productId: string) {
    const owns = await PurchaseModel.findOne({ tenantId, buyerId, productId, status: 'completed' });
    if (!owns) throw new ForbiddenError('Purchase required');
    const product = await ProductModel.findById(productId);
    return { contentUrl: product?.contentUrl };
  },
};

import { bus as _bus } from '../../core/eventBus.js';
import { logger } from '../../core/logger.js';
/** Completes a marketplace purchase when its payment settles (safe no-op for bookings). */
export function startMarketplaceConsumers(): void {
  _bus.subscribe('payment.succeeded', (e) => {
    const p = e.payload as { bookingId?: string; paymentId?: string };
    if (e.meta.tenantId && p.bookingId && p.paymentId) {
      void marketplaceService.completePurchase(e.meta.tenantId, p.bookingId, p.paymentId);
    }
  });
  logger.info('marketplace consumers started');
}
