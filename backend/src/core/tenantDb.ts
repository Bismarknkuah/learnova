import mongoose, { type Connection, type Model, type Schema } from 'mongoose';
import { config } from '../config/index.js';
import { logger } from './logger.js';

/**
 * Database-per-tenant connection manager.
 *
 * Learnova supports two isolation modes (config.tenancy.isolation):
 *   • 'shared'   — every school lives in one database, isolated by `tenantId` on every
 *                  document. Simple, cheap, and the default. Fully working today.
 *   • 'database' — every school gets its OWN MongoDB database (e.g. learnova_accra-high).
 *                  Strongest isolation: a school's data is physically separate, trivially
 *                  exportable, and independently backup-able — ideal for "rent-a-school".
 *
 * The platform/control data (the tenant registry) always lives in the primary connection.
 * Per-school connections are created lazily and cached so we never re-dial the same DB.
 */
const cache = new Map<string, Connection>();

/** Database name for a school slug, e.g. 'accra-high' → 'learnova_accra-high'. */
export function tenantDbName(slug: string): string {
  return `${config.tenancy.dbPrefix}${slug.replace(/[^a-z0-9-_]/gi, '').toLowerCase()}`;
}

/**
 * Get the Mongoose connection for a school.
 * In 'shared' mode this is always the primary connection.
 * In 'database' mode it lazily opens (and caches) the school's dedicated database.
 */
export function getTenantConnection(slug: string): Connection {
  if (config.tenancy.isolation === 'shared') return mongoose.connection;
  const dbName = tenantDbName(slug);
  const existing = cache.get(dbName);
  if (existing) return existing;
  const conn = mongoose.createConnection(config.tenancy.baseUri, { dbName });
  conn.on('connected', () => logger.info({ dbName }, 'tenant database connected'));
  conn.on('error', (e) => logger.error({ dbName, err: e }, 'tenant database error'));
  cache.set(dbName, conn);
  return conn;
}

/** Resolve a school slug from a request: subdomain → header → explicit body/query. */
export function resolveTenantSlug(host?: string, header?: string): string | undefined {
  if (header) return header;
  if (host) {
    const sub = host.split(':')[0].split('.')[0];
    if (sub && sub !== 'www' && sub !== config.tenancy.rootDomain.split('.')[0]) return sub;
  }
  return undefined;
}

export async function closeTenantConnections(): Promise<void> {
  await Promise.all([...cache.values()].map((c) => c.close()));
  cache.clear();
}


/**
 * Get a Mongoose model bound to a school's connection. In 'shared' mode this is the model on
 * the primary connection; in 'database' mode it's compiled on (and cached by) the school's own DB.
 * This is what makes auth physically read/write the right database per school.
 */
export function tenantModel<T = unknown>(slug: string, name: string, schema: Schema): Model<T> {
  const conn = getTenantConnection(slug);
  return (conn.models[name] as Model<T>) ?? conn.model<T>(name, schema);
}
