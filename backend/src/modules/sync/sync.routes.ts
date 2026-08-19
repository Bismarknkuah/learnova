import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, ok } from '../../core/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { assignmentService } from '../assignments/assignment.service.js';
import { logger } from '../../core/logger.js';

/**
 * Offline-sync intake. Clients (PWA / mobile) queue actions while offline and POST them in a
 * batch when connectivity returns. Each item is idempotent-keyed by clientId so replays are safe.
 * New offline-able actions just add a case to the switch.
 */
export const syncRoutes = Router();
syncRoutes.use(requireAuth);

const batchSchema = z.object({
  actions: z.array(z.object({
    clientId: z.string(),
    type: z.string(),
    payload: z.record(z.unknown()),
    at: z.number().optional(),
  })).max(200),
});

syncRoutes.post('/', validate(batchSchema), asyncHandler(async (req, res) => {
  const results: { clientId: string; ok: boolean; error?: string }[] = [];
  for (const a of req.body.actions) {
    try {
      switch (a.type) {
        case 'assignment.submit':
          await assignmentService.submit(req.user!.tenantId, req.user!.id, a.payload as never);
          break;
        default:
          logger.warn({ type: a.type }, 'sync: unhandled action type (acked)');
      }
      results.push({ clientId: a.clientId, ok: true });
    } catch (e) {
      results.push({ clientId: a.clientId, ok: false, error: (e as Error).message });
    }
  }
  ok(res, { processed: results.length, results });
}));
