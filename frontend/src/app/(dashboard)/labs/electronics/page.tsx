'use client';
import { useState } from 'react';
import { Card } from '@/components/ui/Card';

export default function ElectronicsLab() {
  const [v, setV] = useState(9);     // volts
  const [r1, setR1] = useState(100); // ohms
  const [r2, setR2] = useState(220);
  const [mode, setMode] = useState<'series' | 'parallel'>('series');
  const rTotal = mode === 'series' ? r1 + r2 : (r1 * r2) / (r1 + r2);
  const i = v / rTotal;
  const power = v * i;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-ink">Electronics Lab — Ohm’s Law</h1>
      <Card className="space-y-4">
        <div className="flex gap-2">
          {(['series', 'parallel'] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} className={`rounded-xl border px-4 py-2 text-sm capitalize ${mode === m ? 'border-brand bg-brand-soft text-brand' : 'border-gray-200'}`}>{m}</button>
          ))}
        </div>
        <label className="block text-sm">Battery: <b>{v} V</b><input type="range" min={1} max={24} value={v} onChange={(e) => setV(+e.target.value)} className="w-full" /></label>
        <label className="block text-sm">R₁: <b>{r1} Ω</b><input type="range" min={10} max={1000} step={10} value={r1} onChange={(e) => setR1(+e.target.value)} className="w-full" /></label>
        <label className="block text-sm">R₂: <b>{r2} Ω</b><input type="range" min={10} max={1000} step={10} value={r2} onChange={(e) => setR2(+e.target.value)} className="w-full" /></label>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl bg-brand-soft p-3"><p className="text-xs text-ink-soft">Total R</p><p className="text-lg font-bold text-brand">{rTotal.toFixed(0)} Ω</p></div>
          <div className="rounded-xl bg-gold-soft p-3"><p className="text-xs text-ink-soft">Current</p><p className="text-lg font-bold text-gold-dark">{(i * 1000).toFixed(1)} mA</p></div>
          <div className="rounded-xl bg-coral-soft p-3"><p className="text-xs text-ink-soft">Power</p><p className="text-lg font-bold text-coral">{power.toFixed(2)} W</p></div>
        </div>
        <p className="text-sm text-ink-soft">I = V / R = {v} / {rTotal.toFixed(0)} = <b>{(i * 1000).toFixed(1)} mA</b></p>
      </Card>
    </div>
  );
}
