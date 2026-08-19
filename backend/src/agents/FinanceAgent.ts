import { BaseAgent, type AgentTask } from './BaseAgent.js';
import type { DomainEvent } from '../core/eventBus.js';
import { logger } from '../core/logger.js';

/**
 * Reacts to payment events for cross-cutting finance concerns (alerts, reconciliation hooks).
 * The authoritative ledger writes live in payment.service; this agent observes + coordinates.
 */
export class FinanceAgent extends BaseAgent {
  constructor() { super('FinanceAgent', ['finance_ops']); }
  reactions() { return { 'payment.succeeded': (e: DomainEvent) => this.onSettled(e) }; }
  private async onSettled(e: DomainEvent) {
    const p = e.payload as { teacherEarnings: number; commission: number };
    logger.info({ ...p }, 'finance.observed_settlement');
    // e.g. notify the teacher, schedule a payout, update analytics rollups.
  }
  async handle(_task: AgentTask) { return { ok: true }; }
}
