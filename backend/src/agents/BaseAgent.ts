import { bus, type DomainEvent } from '../core/eventBus.js';
import { logger } from '../core/logger.js';

export interface AgentTask<I = unknown> { goal?: string; input: I; context?: Record<string, unknown> }

/** Base for every specialist agent. Subclasses declare capabilities + event reactions. */
export abstract class BaseAgent {
  protected log;
  constructor(public readonly name: string, public readonly capabilities: string[] = []) {
    this.log = logger.child({ agent: name });
  }
  reactions(): Record<string, (e: DomainEvent) => void | Promise<void>> { return {}; }
  register(): this {
    for (const [pattern, handler] of Object.entries(this.reactions())) bus.subscribe(pattern, handler);
    this.log.info({ capabilities: this.capabilities }, 'agent.registered');
    return this;
  }
  abstract handle(task: AgentTask): Promise<unknown>;
  protected emit(type: string, payload: unknown, meta: DomainEvent['meta'] = {}) {
    return bus.publish(type, payload, { ...meta, actorId: this.name });
  }
}
