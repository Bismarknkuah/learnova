import { EventEmitter } from 'node:events';
import { logger } from './logger.js';

export interface DomainEvent<T = unknown> {
  id: string;
  type: string;
  payload: T;
  meta: { tenantId?: string; actorId?: string; correlationId?: string; sessionId?: string };
  ts: number;
}

type Handler = (event: DomainEvent) => void | Promise<void>;

/**
 * In-memory event bus behind a stable interface. Swap the internals for Redis Streams /
 * Kafka in production without touching publishers or subscribers.
 */
class EventBus {
  private emitter = new EventEmitter();
  constructor() { this.emitter.setMaxListeners(200); }

  async publish<T>(type: string, payload: T, meta: DomainEvent['meta'] = {}): Promise<string> {
    const event: DomainEvent<T> = { id: rid(), type, payload, meta, ts: Date.now() };
    logger.debug({ type, correlationId: meta.correlationId }, 'event.publish');
    setImmediate(() => this.emitter.emit(type, event));
    setImmediate(() => this.emitter.emit('*', event));
    return event.id;
  }

  subscribe(pattern: string, handler: Handler): this {
    const wrap = (event: DomainEvent) => Promise.resolve(handler(event)).catch((err) =>
      logger.error({ type: event.type, err: err.message }, 'subscriber failed'));
    if (pattern.endsWith('.*')) {
      const prefix = pattern.slice(0, -1);
      this.emitter.on('*', (e: DomainEvent) => { if (e.type.startsWith(prefix)) wrap(e); });
    } else {
      this.emitter.on(pattern, wrap);
    }
    return this;
  }
}

const rid = () => 'evt_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
export const bus = new EventBus();
