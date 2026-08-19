import { Redis } from 'ioredis';
import { config } from '../config/index.js';
import { logger } from './logger.js';

/** Redis is optional in dev: empty REDIS_URL disables it cleanly (no retry spam). */
const REDIS_ENABLED = Boolean(config.redisUrl && config.redisUrl.trim());

let warned = false;

/** Lazy Redis client for caching, sessions, rate limiting, and the event-bus transport. */
export const redis = new Redis(config.redisUrl || 'redis://localhost:6379', {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
  // Stop infinite reconnection: give up after 2 tries instead of erroring forever.
  retryStrategy: (times) => (times > 2 ? null : 200),
});

redis.on('error', (err) => {
  if (!warned) {
    logger.warn({ err: err.message }, 'Redis unavailable — continuing without cache');
    warned = true;
  }
});

export async function connectRedis(): Promise<void> {
  if (!REDIS_ENABLED) {
    logger.info('Redis disabled (no REDIS_URL) — running without cache');
    return;
  }
  try {
    await redis.connect();
    logger.info('Redis connected');
  } catch {
    logger.warn('Redis unavailable — continuing without cache (dev mode)');
  }
}
