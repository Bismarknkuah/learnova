import { closeTenantConnections } from './core/tenantDb.js';
import { bootstrap } from './server.js';
import { logger } from './core/logger.js';
import { disconnectMongo } from './core/db.js';
import { redis } from './core/redis.js';

async function main() {
  const server = await bootstrap();

  // Graceful shutdown: stop accepting connections, drain, close resources.
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'shutting down');
    server.close(async () => {
      try { await closeTenantConnections();
  await disconnectMongo(); } catch { /* noop */ }
      try { await redis.quit(); } catch { /* noop */ }
      logger.info('shutdown complete');
      process.exit(0);
    });
    // Force-exit if drain takes too long.
    setTimeout(() => { logger.error('forced shutdown'); process.exit(1); }, 10_000).unref();
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => logger.error({ reason }, 'unhandledRejection'));
}

main().catch((err) => {
  logger.error({ err: (err as Error).stack }, 'fatal boot error');
  process.exit(1);
});
