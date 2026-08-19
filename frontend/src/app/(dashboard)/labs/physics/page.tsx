'use client';
import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/Card';

export default function PhysicsLab() {
  const cv = useRef<HTMLCanvasElement | null>(null);
  const [v, setV] = useState(30);   // m/s
  const [angle, setAngle] = useState(45); // deg
  const g = 9.81;
  const rad = (angle * Math.PI) / 180;
  const range = (v * v * Math.sin(2 * rad)) / g;
  const maxH = (v * v * Math.sin(rad) ** 2) / (2 * g);
  const tFlight = (2 * v * Math.sin(rad)) / g;

  useEffect(() => {
    const c = cv.current?.getContext('2d'); const W = 700, H = 360; if (!c) return;
    c.clearRect(0, 0, W, H); c.fillStyle = '#f8fafc'; c.fillRect(0, 0, W, H);
    c.strokeStyle = '#cbd5e1'; c.beginPath(); c.moveTo(40, H - 30); c.lineTo(W - 10, H - 30); c.stroke();
    const scale = Math.min((W - 70) / (range || 1), (H - 60) / (maxH || 1));
    c.strokeStyle = '#0E7C5A'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(40, H - 30);
    for (let t = 0; t <= tFlight; t += tFlight / 120) {
      const x = 40 + v * Math.cos(rad) * t * scale;
      const y = H - 30 - (v * Math.sin(rad) * t - 0.5 * g * t * t) * scale;
      c.lineTo(x, y);
    }
    c.stroke();
    c.fillStyle = '#F2A900'; c.beginPath();
    c.arc(40 + range * scale, H - 30, 5, 0, Math.PI * 2); c.fill();
  }, [v, angle, range, maxH, tFlight, rad]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-ink">Physics Lab — Projectile Motion</h1>
      <Card>
        <canvas ref={cv} width={700} height={360} className="w-full rounded-xl" />
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label className="text-sm">Velocity: <b>{v} m/s</b><input type="range" min={5} max={60} value={v} onChange={(e) => setV(+e.target.value)} className="w-full" /></label>
          <label className="text-sm">Angle: <b>{angle}°</b><input type="range" min={5} max={85} value={angle} onChange={(e) => setAngle(+e.target.value)} className="w-full" /></label>
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-sm text-ink-soft">
          <span>Range: <b className="text-brand">{range.toFixed(1)} m</b></span>
          <span>Max height: <b className="text-brand">{maxH.toFixed(1)} m</b></span>
          <span>Flight time: <b className="text-brand">{tFlight.toFixed(2)} s</b></span>
        </div>
      </Card>
    </div>
  );
}
