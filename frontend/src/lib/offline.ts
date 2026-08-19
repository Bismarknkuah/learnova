'use client';
import { api } from './api';

export interface QueuedAction { clientId: string; type: string; payload: Record<string, unknown>; at: number }
const KEY = 'learnova-offline-queue';

function read(): QueuedAction[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); } catch { return []; }
}
function write(q: QueuedAction[]) { localStorage.setItem(KEY, JSON.stringify(q)); }

/** Queue an action while offline; it will be replayed to /sync on reconnect. */
export function enqueue(type: string, payload: Record<string, unknown>) {
  const q = read();
  q.push({ clientId: crypto.randomUUID(), type, payload, at: Date.now() });
  write(q);
}

/** Flush the queue to the backend. Safe to call repeatedly (server is idempotent by clientId). */
export async function flushQueue(token?: string): Promise<number> {
  const q = read();
  if (!q.length || !navigator.onLine) return 0;
  try {
    await api.post('/sync', { actions: q }, token);
    write([]);
    return q.length;
  } catch {
    return 0; // keep the queue; try again next reconnect
  }
}

export const queueSize = () => read().length;
