import { logger } from '../../../core/logger.js';

/**
 * Mobile Money (MTN shown; Telecel + AirtelTigo follow the same interface).
 * Flow: requestToPay -> subscriber approves on phone -> poll/callback for status.
 * Wire real MTN MoMo Collections credentials; keep the interface so callers stay neutral.
 */
export const momo = {
  async requestToPay(args: { amountGHS: number; payerPhone: string; reference: string; note?: string }) {
    logger.info({ ...args }, 'momo.requestToPay');
    // await fetch('https://.../collection/v1_0/requesttopay', { headers: { 'X-Reference-Id': args.reference }})
    return { reference: args.reference, status: 'PENDING' as const };
  },
  async status(reference: string) {
    return { reference, status: 'PENDING' as 'PENDING' | 'SUCCESSFUL' | 'FAILED' };
  },
};
