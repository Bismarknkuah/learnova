'use client';
import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { ShieldCheck, Link2, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';

interface Cert { _id: string; title: string; sha256: string; verifyCode: string; chain?: { network?: string; txHash?: string }; createdAt?: string }

export default function CertificatesPage() {
  const token = useAuth((s) => s.accessToken) ?? undefined;
  const { data } = useQuery({ queryKey: ['certs'], queryFn: () => api.get<Cert[]>('/certificates', token), enabled: !!token });
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-ink">My certificates</h1>
        <p className="text-sm text-ink-soft">Each certificate is hashed and anchored on-chain. Share the QR with employers to verify authenticity.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {data?.map((c) => (
          <Card key={c._id} className="flex gap-4">
            <div className="flex flex-col items-center">
              <QRCodeSVG value={`${origin}/verify/${c.verifyCode}`} size={96} fgColor="#0F1B2D" />
              <a href={`/verify/${c.verifyCode}`} target="_blank" className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand">Verify <ExternalLink className="h-3 w-3" /></a>
            </div>
            <div className="min-w-0 flex-1">
              <p className="inline-flex items-center gap-1 font-semibold text-ink"><ShieldCheck className="h-4 w-4 text-brand" /> {c.title}</p>
              {c.createdAt && <p className="text-xs text-ink-soft">{new Date(c.createdAt).toLocaleDateString()}</p>}
              <p className="mt-2 break-all text-xs text-gray-400">SHA-256: {c.sha256.slice(0, 32)}…</p>
              {c.chain?.txHash && <p className="mt-1 inline-flex items-start gap-1 break-all text-xs text-brand"><Link2 className="mt-0.5 h-3 w-3 shrink-0" /> {c.chain.network}: {c.chain.txHash.slice(0, 24)}…</p>}
              <p className="mt-2 font-mono text-xs text-ink-soft">Code: {c.verifyCode}</p>
            </div>
          </Card>
        ))}
      </div>
      {!data?.length && <p className="text-ink-soft">No certificates yet. Once a school issues you one, it appears here with a verifiable QR code.</p>}
    </div>
  );
}
