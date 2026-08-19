'use client';
import Link from 'next/link';
import { Cpu, Zap, Network, Atom, CircuitBoard, MemoryStick } from 'lucide-react';
import { Card } from '@/components/ui/Card';

const LABS = [
  { href: '/labs/logic', kind: 'Computer Engineering', title: 'Logic Circuit Lab', brief: 'Build & test digital logic gates live.', icon: Cpu, ready: true },
  { href: '/labs/electronics', kind: 'Electronics', title: 'Ohm’s Law / Breadboard', brief: 'Series & parallel circuits, current & power.', icon: Zap, ready: true },
  { href: '/labs/physics', kind: 'Physics', title: 'Projectile Motion', brief: 'Real kinematics — range, height, flight time.', icon: Atom, ready: true },
  { href: '/labs/networking', kind: 'Networking', title: 'Subnet Calculator', brief: 'Network, broadcast, hosts from IP/CIDR.', icon: Network, ready: true },
  { href: '#', kind: 'Computer Engineering', title: 'FPGA Simulation', brief: 'Requires an HDL synthesis engine.', icon: MemoryStick, ready: false },
  { href: '#', kind: 'Networking', title: 'Cisco Router Lab', brief: 'Requires a Packet-Tracer-grade engine.', icon: CircuitBoard, ready: false },
];

export default function LabsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-ink">Virtual laboratories</h1>
      <p className="text-sm text-ink-soft">Run engineering and science practicals in the browser — no hardware needed.</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {LABS.map((l) => (
          <Card key={l.title} className="h-full">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-soft text-brand"><l.icon className="h-5 w-5" /></span>
            <span className="mt-3 block text-xs uppercase tracking-wide text-gray-400">{l.kind}</span>
            <h3 className="font-bold text-ink">{l.title}</h3>
            <p className="text-sm text-ink-soft">{l.brief}</p>
            {l.ready
              ? <Link href={l.href} className="mt-2 inline-block text-sm font-semibold text-brand">Open lab →</Link>
              : <span className="mt-2 inline-block text-sm text-gray-400">Coming soon</span>}
          </Card>
        ))}
      </div>
    </div>
  );
}
