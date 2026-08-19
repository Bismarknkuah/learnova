import { config } from '../config/index.js';
import { logger } from '../core/logger.js';
import { getAiConfig } from './provider.js';

export interface CompleteArgs {
  system?: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  maxTokens?: number;
}

// --- Anthropic (Claude) messages API ---
async function anthropicComplete(apiKey: string, baseUrl: string, model: string, { system, messages, maxTokens = 1024 }: CompleteArgs): Promise<string> {
  const res = await fetch(`${baseUrl}/v1/messages`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model, max_tokens: maxTokens, system, messages }),
  });
  if (!res.ok) throw new Error(`Anthropic HTTP ${res.status}`);
  const data = (await res.json()) as { content: { type: string; text?: string }[] };
  return data.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
}

// --- OpenAI-compatible chat completions (OpenAI, DeepSeek, self-hosted Llama/Mistral, etc.) ---
async function openaiCompatibleComplete(apiKey: string, baseUrl: string, model: string, { system, messages, maxTokens = 1024 }: CompleteArgs): Promise<string> {
  const msgs = system ? [{ role: 'system', content: system }, ...messages] : messages;
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, max_tokens: maxTokens, messages: msgs }),
  });
  if (!res.ok) throw new Error(`Provider HTTP ${res.status}`);
  const data = (await res.json()) as { choices: { message: { content: string } }[] };
  return data.choices?.[0]?.message?.content ?? '';
}

function stub({ system, messages }: CompleteArgs): string {
  const last = messages[messages.length - 1]?.content ?? '';
  const q = last.replace(/^Question:\s*/i, '').replace(/Excerpts:[\s\S]*?Question:\s*/i, '').trim();
  const isTwin = /AI Twin/i.test(system ?? '');
  if (isTwin) {
    return `Great question — "${q.slice(0, 140)}". I'd normally answer from your teacher's lesson materials. `
      + `Full AI Twin answers switch on once an AI provider key is configured in Settings. In the meantime, try the lesson notes in your Library, or book a live session with the teacher.`;
  }
  return `Let's work through "${q.slice(0, 140)}". Here's how to approach it:\n\n`
    + `1. Identify exactly what's being asked and the key terms.\n`
    + `2. Recall the relevant rule, formula or definition.\n`
    + `3. Apply it step by step, checking each step.\n`
    + `4. Sanity-check your answer against what you expected.\n\n`
    + `For full conversational AI, an admin can connect a provider (Claude, OpenAI, DeepSeek or a self-hosted model) in Settings → AI Provider.`;
}

async function callProvider(args: CompleteArgs): Promise<string> {
  const c = await getAiConfig();
  if (!c.apiKey && c.provider !== 'custom') return stub(args);
  if (c.provider === 'anthropic') return anthropicComplete(c.apiKey, c.baseUrl, c.model, args);
  return openaiCompatibleComplete(c.apiKey, c.baseUrl, c.model, args); // openai | deepseek | custom
}

export const llm = {
  async complete(args: CompleteArgs): Promise<string> {
    try { return await callProvider(args); }
    catch (err) { logger.error({ err: (err as Error).message }, 'LLM failed, using fallback'); return stub(args); }
  },
  async embed(text: string): Promise<number[]> { return hashEmbed(text, 256); },
};

function hashEmbed(text: string, dims: number): number[] {
  const v = new Array(dims).fill(0);
  for (const tok of String(text).toLowerCase().split(/\W+/).filter(Boolean)) {
    let h = 2166136261;
    for (let i = 0; i < tok.length; i++) { h ^= tok.charCodeAt(i); h = Math.imul(h, 16777619); }
    v[Math.abs(h) % dims] += 1;
  }
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / norm);
}
