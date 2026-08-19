'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { ShieldCheck, ShieldX, GraduationCap, Link2 } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface Verified {
  valid: boolean; title?: string; studentName?: string; issuer?: string;
  sha256?: string; chain?: { network?: string; txHash?: string }; verifyCode?: string; issuedAt?: string;
}

export default function VerifyPage() {
  const { code } = useParams<{ code: string }>();
  const [data, setData] = useState<Verified | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/v1/certificates/verify/${code}`)
      .then((r) => r.json()).then((j) => setData(j.data ?? { valid: false }))
      .catch(() => setData({ valid: false })).finally(() => setLoading(false));
  }, [code]);

  const url = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <main className="grid min-h-screen place-items-center bg-gradient-to-br from-brand/5 to-gold/5 p-6">
      <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-8 shadow-card">
        <div className="mb-4 inline-flex items-center gap-2 text-lg font-extrabold text-brand"><GraduationCap className="h-6 w-6" /> Learnova</div>
        {loading ? <p className="text-ink-soft">Verifying…</p> : data?.valid ? (
          <>
            <div className="flex items-center gap-2 rounded-xl bg-brand-soft px-3 py-2 text-brand">
              <ShieldCheck className="h-5 w-5" /> <span className="font-semibold">Authentic certificate</span>
            </div>
            <h1 className="mt-4 text-xl font-bold text-ink">{data.title}</h1>
            <dl className="mt-3 space-y-1.5 text-sm">
              {data.studentName && <div className="flex justify-between"><dt className="text-ink-soft">Awarded to</dt><dd className="font-medium">{data.studentName}</dd></div>}
              {data.issuer && <div className="flex justify-between"><dt className="text-ink-soft">Issued by</dt><dd className="font-medium">{data.issuer}</dd></div>}
              {data.issuedAt && <div className="flex justify-between"><dt className="text-ink-soft">Date</dt><dd className="font-medium">{new Date(data.issuedAt).toLocaleDateString()}</dd></div>}
            </dl>
            <div className="mt-4 flex justify-center"><QRCodeSVG value={url} size={140} fgColor="#0F1B2D" /></div>
            <div className="mt-4 space-y-1 break-all rounded-xl bg-gray-50 p-3 text-xs text-ink-soft">
              <p><span className="font-semibold">SHA-256:</span> {data.sha256}</p>
              {data.chain?.txHash && <p className="inline-flex items-start gap-1"><Link2 className="mt-0.5 h-3 w-3 text-brand" /> Anchored on {data.chain.network}: {data.chain.txHash}</p>}
            </div>
            <p className="mt-3 text-center text-xs text-ink-soft">Tamper-proof: the document hash is anchored on-chain.</p>
          </>
        ) : (
          <div className="flex items-center gap-2 rounded-xl bg-coral-soft px-3 py-3 text-coral">
            <ShieldX className="h-5 w-5" /> <span className="font-semibold">No certificate found for this code.</span>
          </div>
        )}
      </div>
    </main>
  );
}
