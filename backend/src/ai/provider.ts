import { Schema, model } from 'mongoose';
import { config } from '../config/index.js';
import { encryptSecret, decryptSecret } from '../core/secretbox.js';

/** Platform-wide AI provider settings, editable at runtime by a super admin (no redeploy). */
const aiConfigSchema = new Schema({
  key: { type: String, default: 'global', unique: true },
  provider: { type: String, default: 'anthropic' },  // anthropic | openai | deepseek | custom
  apiKey: { type: String, default: '' },
  baseUrl: { type: String, default: '' },            // for openai-compatible / self-hosted
  model: { type: String, default: '' },
}, { timestamps: true });
export const AiConfigModel = model('AiConfig', aiConfigSchema);

export interface ResolvedAi { provider: string; apiKey: string; baseUrl: string; model: string }

// Sensible defaults per provider.
const DEFAULTS: Record<string, { baseUrl: string; model: string }> = {
  anthropic: { baseUrl: 'https://api.anthropic.com', model: 'claude-sonnet-4-6' },
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  deepseek: { baseUrl: 'https://api.deepseek.com', model: 'deepseek-chat' },
  custom: { baseUrl: '', model: '' },
};

let cache: ResolvedAi | null = null;

/** Load (and cache) the effective AI config: DB overrides env. */
export async function getAiConfig(): Promise<ResolvedAi> {
  if (cache) return cache;
  const doc = await AiConfigModel.findOne({ key: 'global' }).catch(() => null);
  const provider = doc?.provider || config.ai.provider || 'anthropic';
  const d = DEFAULTS[provider] ?? DEFAULTS.anthropic;
  cache = {
    provider,
    apiKey: decryptSecret(doc?.apiKey ?? '') || config.ai.anthropicApiKey || '',
    baseUrl: doc?.baseUrl || d.baseUrl,
    model: doc?.model || config.ai.model || d.model,
  };
  return cache;
}

export async function setAiConfig(patch: Partial<ResolvedAi>): Promise<ResolvedAi> {
  const toSave: Record<string, unknown> = { ...patch, key: 'global' };
  if (patch.apiKey) toSave.apiKey = encryptSecret(patch.apiKey);   // store encrypted at rest
  else delete toSave.apiKey;                                        // blank => keep existing key
  await AiConfigModel.findOneAndUpdate({ key: 'global' }, toSave, { upsert: true });
  cache = null;            // invalidate so next read reloads
  return getAiConfig();
}

export function invalidateAiCache() { cache = null; }
