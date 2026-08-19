'use client';
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

type GateType = 'AND' | 'OR' | 'NOT' | 'XOR' | 'NAND' | 'NOR';
interface Gate { id: string; type: GateType; a: string; b: string }

const BINARY: GateType[] = ['AND', 'OR', 'XOR', 'NAND', 'NOR'];
const evalGate = (t: GateType, a: boolean, b: boolean): boolean => {
  switch (t) {
    case 'AND': return a && b;
    case 'OR': return a || b;
    case 'XOR': return a !== b;
    case 'NAND': return !(a && b);
    case 'NOR': return !(a || b);
    case 'NOT': return !a;
  }
};

/** A real, live logic-circuit simulator. Inputs A/B feed a chain of gates the student builds. */
export default function LogicLab() {
  const [a, setA] = useState(false);
  const [b, setB] = useState(false);
  const [gates, setGates] = useState<Gate[]>([{ id: 'g1', type: 'AND', a: 'A', b: 'B' }]);

  // Evaluate every signal in order: inputs first, then each gate (may reference earlier gates).
  const signals = useMemo(() => {
    const vals: Record<string, boolean> = { A: a, B: b };
    for (const g of gates) {
      const av = vals[g.a] ?? false;
      const bv = vals[g.b] ?? false;
      vals[g.id] = evalGate(g.type, av, bv);
    }
    return vals;
  }, [a, b, gates]);

  const sources = ['A', 'B', ...gates.map((g) => g.id)];
  const addGate = () => setGates((gs) => [...gs, { id: `g${gs.length + 1}`, type: 'AND', a: sources[0], b: sources[0] }]);
  const update = (id: string, patch: Partial<Gate>) => setGates((gs) => gs.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  const out = gates.length ? signals[gates[gates.length - 1].id] : false;

  const Bulb = ({ on }: { on: boolean }) => (
    <span className={`inline-block h-4 w-4 rounded-full ${on ? 'bg-green-500' : 'bg-gray-300'}`} />
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Logic Circuit Lab</h1>

      <Card>
        <h2 className="mb-2 font-semibold">Inputs</h2>
        <div className="flex gap-6">
          {([['A', a, setA], ['B', b, setB]] as const).map(([label, val, set]) => (
            <button key={label} onClick={() => set(!val)} className="flex items-center gap-2">
              <span className="font-mono">{label}</span><Bulb on={val} />
              <span className="text-xs text-gray-400">{val ? '1' : '0'}</span>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">Gates</h2>
          <Button onClick={addGate} className="px-3 py-1 text-sm">+ Add gate</Button>
        </div>
        <div className="space-y-2">
          {gates.map((g) => (
            <div key={g.id} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="w-8 font-mono text-gray-500">{g.id}</span>
              <select value={g.type} onChange={(e) => update(g.id, { type: e.target.value as GateType })} className="rounded border px-2 py-1">
                {(['AND', 'OR', 'NOT', 'XOR', 'NAND', 'NOR'] as GateType[]).map((t) => <option key={t}>{t}</option>)}
              </select>
              <select value={g.a} onChange={(e) => update(g.id, { a: e.target.value })} className="rounded border px-2 py-1">
                {sources.map((s) => <option key={s}>{s}</option>)}
              </select>
              {BINARY.includes(g.type) && (
                <select value={g.b} onChange={(e) => update(g.id, { b: e.target.value })} className="rounded border px-2 py-1">
                  {sources.map((s) => <option key={s}>{s}</option>)}
                </select>
              )}
              <span className="text-gray-400">=</span><Bulb on={signals[g.id]} />
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-3">
          <h2 className="font-semibold">Output</h2><Bulb on={out} />
          <span className="font-mono text-lg">{out ? '1' : '0'}</span>
        </div>
      </Card>
    </div>
  );
}
