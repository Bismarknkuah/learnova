'use client';
import { AiProviderSettings } from '@/components/AiProviderSettings';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { ShieldCheck, ShieldOff, Smartphone } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';
import { useMe } from '@/features/profile/useMe';

export default function SettingsPage() {
  const token = useAuth((s) => s.accessToken) ?? undefined;
  const { data: me, refetch } = useMe();
  const [otpauth, setOtpauth] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');

  const setup = async () => {
    setMsg('');
    const r = await api.post<{ otpauth: string }>('/auth/mfa/setup', {}, token);
    setOtpauth(r.otpauth);
  };
  const enable = async () => {
    try { await api.post('/auth/mfa/enable', { code }, token); setOtpauth(null); setCode(''); setMsg('✓ Two-factor authentication enabled.'); refetch(); }
    catch (e) { setMsg((e as Error).message); }
  };
  const disable = async () => {
    const c = prompt('Enter a current 6-digit code to disable 2FA:');
    if (!c) return;
    try { await api.post('/auth/mfa/disable', { code: c }, token); setMsg('Two-factor authentication disabled.'); refetch(); }
    catch (e) { setMsg((e as Error).message); }
  };

  const mfaOn = (me as { mfaEnabled?: boolean })?.mfaEnabled;

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <h1 className="text-2xl font-bold text-ink">Account & security</h1>
      {me?.role === 'super_admin' && <AiProviderSettings />}

      <Card>
        <p className="text-sm text-ink-soft">Signed in as</p>
        <p className="font-semibold text-ink">{me?.name} · <span className="capitalize">{me?.role?.replace('_', ' ')}</span></p>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <p className="inline-flex items-center gap-2 font-semibold text-ink">
            {mfaOn ? <ShieldCheck className="h-5 w-5 text-brand" /> : <Smartphone className="h-5 w-5 text-ink-soft" />} Two-factor authentication
          </p>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${mfaOn ? 'bg-brand-soft text-brand' : 'bg-gray-100 text-ink-soft'}`}>{mfaOn ? 'On' : 'Off'}</span>
        </div>
        <p className="mt-1 text-sm text-ink-soft">Protect your account with a code from an authenticator app (Google Authenticator, Authy, etc.).</p>

        {!mfaOn && !otpauth && <button onClick={setup} className="mt-3 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white">Set up 2FA</button>}

        {otpauth && (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-ink">1. Scan this with your authenticator app:</p>
            <div className="inline-block rounded-xl border border-gray-200 bg-white p-3"><QRCodeSVG value={otpauth} size={160} /></div>
            <p className="text-sm text-ink">2. Enter the 6-digit code it shows:</p>
            <div className="flex gap-2">
              <input inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              <button onClick={enable} disabled={code.length < 6} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">Enable</button>
            </div>
          </div>
        )}

        {mfaOn && <button onClick={disable} className="mt-3 inline-flex items-center gap-1 rounded-xl border border-coral/40 px-4 py-2 text-sm font-medium text-coral"><ShieldOff className="h-4 w-4" /> Disable 2FA</button>}
        {msg && <p className="mt-3 text-sm text-brand">{msg}</p>}
      </Card>
    </div>
  );
}
