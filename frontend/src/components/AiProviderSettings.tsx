'use client';
import { useEffect, useState } from 'react';
import { Cpu, CheckCircle2, Zap } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';

interface Cfg { provider: string; baseUrl?: string; model?: string; connected?: boolean; keySet?: boolean }
const PROVIDERS = [
  { id: 'anthropic', name: 'Claude (Anthropic)', placeholder: 'claude-sonnet-4-6' },
  { id: 'openai', name: 'OpenAI (GPT)', placeholder: 'gpt-4o-mini' },
  { id: 'deepseek', name: 'DeepSeek', placeholder: 'deepseek-chat' },
  { id: 'custom', name: 'Self-hosted / other (OpenAI-compatible)', placeholder: 'llama-3.1-8b-instruct' },
];

export function AiProviderSettings() {
  const token = useAuth((s) => s.accessToken) ?? undefined;
  const [cfg, setCfg] = useState<Cfg>({ provider: 'anthropic' });
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [msg, setMsg] = useState('');
  const [testing, setTesting] = useState(false);

  useEffect(() => { api.get<Cfg>('/ai/provider', token).then((c) => { setCfg(c); setBaseUrl(c.baseUrl ?? ''); setModel(c.model ?? ''); }).catch(() => {}); }, [token]);

  const save = async () => {
    setMsg('');
    const c = await api.patch<Cfg>('/ai/provider', { provider: cfg.provider, apiKey: apiKey || undefined, baseUrl: baseUrl || undefined, model: model || undefined }, token);
    setCfg({ ...c, connected: true }); setApiKey(''); setMsg('Saved. The whole platform now uses this provider.');
  };
  const test = async () => {
    setTesting(true); setMsg('');
    try { const r = await api.post<{ reply: string }>('/ai/provider/test', {}, token); setMsg(`Test reply: ${r.reply}`); }
    catch (e) { setMsg(`Test failed: ${(e as Error).message}`); } finally { setTesting(false); }
  };

  const active = PROVIDERS.find((p) => p.id === cfg.provider);

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="inline-flex items-center gap-2 font-bold text-ink"><Cpu className="h-5 w-5 text-violet-600" /> AI Provider</p>
        {cfg.keySet ? <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand"><CheckCircle2 className="h-3.5 w-3.5" /> Connected</span>
          : <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-ink-soft">Inbuilt fallback</span>}
      </div>
      <p className="text-sm text-ink-soft">Connect a model to give the whole platform GPT/Claude-class fluency. Without a key, the inbuilt assistant is used.</p>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-sm">Provider
          <select value={cfg.provider} onChange={(e) => setCfg({ ...cfg, provider: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
            {PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label className="text-sm">Model
          <input value={model} onChange={(e) => setModel(e.target.value)} placeholder={active?.placeholder} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <label className="text-sm sm:col-span-2">API key {cfg.keySet && <span className="text-ink-soft">(leave blank to keep current)</span>}
          <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-…" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </label>
        {(cfg.provider === 'custom' || cfg.provider === 'deepseek') && (
          <label className="text-sm sm:col-span-2">Base URL (OpenAI-compatible endpoint)
            <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://your-host/v1" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </label>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button onClick={save} className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white">Save provider</button>
        <button onClick={test} disabled={testing} className="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-ink hover:border-brand"><Zap className="h-4 w-4" /> {testing ? 'Testing…' : 'Test connection'}</button>
      </div>
      {msg && <p className="rounded-lg bg-gray-50 p-2 text-sm text-ink-soft">{msg}</p>}
    </Card>
  );
}
