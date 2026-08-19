import http from 'node:http';
import { config } from './config/index.js';
import { logger } from './core/logger.js';
import { connectMongo } from './core/db.js';
import { connectRedis } from './core/redis.js';
import { createApp } from './app.js';
import { agentSystem } from './agents/index.js';
import { attachRealtime } from './realtime.js';
import { startNotificationConsumers } from './modules/notifications/notification.service.js';
import { startGamificationConsumers } from './modules/gamification/gamification.service.js';
import { startMarketplaceConsumers } from './modules/marketplace/marketplace.service.js';

export async function bootstrap(): Promise<http.Server> {
  agentSystem.start();
  startNotificationConsumers();
  startGamificationConsumers();
  startMarketplaceConsumers();
  try { await connectMongo(); } catch { logger.warn('Mongo unavailable — running without persistence'); }
  await connectRedis();

  // One-time production seeding: set SEED_ON_BOOT=true to populate the DB this backend
  // actually connects to (removes local-vs-prod database mismatches). Idempotent (upserts).
  if (process.env.SEED_ON_BOOT === 'true') {
    try {
      const { seedDatabase } = await import('./seed.js');
      await seedDatabase();
      logger.info('SEED_ON_BOOT complete — you can remove the SEED_ON_BOOT variable now.');
    } catch (e) { logger.error({ err: (e as Error).message }, 'SEED_ON_BOOT failed'); }
  }

  const app = createApp();
  const server = http.createServer(app);
  attachRealtime(server);

  server.listen(config.port, () => logger.info({ port: config.port }, 'Learnova API up'));
  return server;
}
