'use client';
import { useState } from 'react';
import { Card } from '@/components/ui/Card';

function subnet(ip: string, cidr: number) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255) || cidr < 0 || cidr > 32) return null;
  const ipNum = parts.reduce((a, p) => (a << 8) + p, 0) >>> 0;
  const mask = cidr === 0 ? 0 : (0xffffffff << (32 - cidr)) >>> 0;
  const network = (ipNum & mask) >>> 0;
  const broadcast = (network | (~mask >>> 0)) >>> 0;
  const toIp = (n: number) => [24, 16, 8, 0].map((s) => (n >>> s) & 255).join('.');
  const hosts = cidr >= 31 ? 0 : 2 ** (32 - cidr) - 2;
  return { network: toIp(network), broadcast: toIp(broadcast), mask: toIp(mask), first: toIp(network + 1), last: toIp(broadcast - 1), hosts };
}

export default function NetworkingLab() {
  const [ip, setIp] = useState('192.168.1.10');
  const [cidr, setCidr] = useState(24);
  const r = subnet(ip, cidr);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-ink">Networking Lab — Subnet Calculator</h1>
      <Card className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <input value={ip} onChange={(e) => setIp(e.target.value)} className="rounded-xl border border-gray-300 px-3 py-2 font-mono" />
          <span className="self-center">/</span>
          <input type="number" min={0} max={32} value={cidr} onChange={(e) => setCidr(+e.target.value)} className="w-20 rounded-xl border border-gray-300 px-3 py-2" />
        </div>
        {r ? (
          <div className="grid gap-2 sm:grid-cols-2 text-sm">
            {[['Network', r.network], ['Broadcast', r.broadcast], ['Subnet mask', r.mask], ['Usable hosts', String(r.hosts)], ['First host', r.first], ['Last host', r.last]].map(([k, val]) => (
              <div key={k} className="flex justify-between rounded-lg bg-gray-50 px-3 py-2"><span className="text-ink-soft">{k}</span><span className="font-mono font-medium text-ink">{val}</span></div>
            ))}
          </div>
        ) : <p className="text-coral text-sm">Enter a valid IPv4 and CIDR (0–32).</p>}
      </Card>
    </div>
  );
}
