'use client';
import { useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { Pencil, Eraser, Trash2 } from 'lucide-react';

interface Stroke { x0: number; y0: number; x1: number; y1: number; color: string; size: number }
const COLORS = ['#0F1B2D', '#0E7C5A', '#F2A900', '#FF6B5A', '#2563EB'];

/** A collaborative whiteboard. Local strokes draw instantly and broadcast over the socket;
 *  remote strokes are drawn as they arrive. Works for drawing, equations, graphs, diagrams. */
export function Whiteboard({ socket, sessionId, canDraw }: { socket: Socket | null; sessionId: string; canDraw: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(3);
  const [erase, setErase] = useState(false);

  const ctx = () => canvasRef.current?.getContext('2d') ?? null;
  const paint = (s: Stroke) => {
    const c = ctx(); if (!c) return;
    c.strokeStyle = s.color; c.lineWidth = s.size; c.lineCap = 'round';
    c.beginPath(); c.moveTo(s.x0, s.y0); c.lineTo(s.x1, s.y1); c.stroke();
  };

  useEffect(() => {
    if (!socket) return;
    const onStroke = (s: Stroke) => paint(s);
    const onClear = () => { const c = ctx(); const cv = canvasRef.current; if (c && cv) c.clearRect(0, 0, cv.width, cv.height); };
    socket.on('wb:stroke', onStroke);
    socket.on('wb:clear', onClear);
    return () => { socket.off('wb:stroke', onStroke); socket.off('wb:clear', onClear); };
  }, [socket]);

  const pos = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const down = (e: React.PointerEvent) => { if (!canDraw) return; drawing.current = true; last.current = pos(e); };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current || !last.current || !canDraw) return;
    const p = pos(e);
    const stroke: Stroke = { x0: last.current.x, y0: last.current.y, x1: p.x, y1: p.y, color: erase ? '#ffffff' : color, size: erase ? 18 : size };
    paint(stroke); socket?.emit('wb:stroke', { sessionId, stroke });
    last.current = p;
  };
  const up = () => { drawing.current = false; last.current = null; };
  const clear = () => { socket?.emit('wb:clear', { sessionId }); const c = ctx(); const cv = canvasRef.current; if (c && cv) c.clearRect(0, 0, cv.width, cv.height); };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3">
      {canDraw && (
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {COLORS.map((c) => (
            <button key={c} onClick={() => { setColor(c); setErase(false); }} style={{ background: c }}
              className={`h-6 w-6 rounded-full ring-2 ${color === c && !erase ? 'ring-brand' : 'ring-transparent'}`} />
          ))}
          <input type="range" min={1} max={10} value={size} onChange={(e) => setSize(Number(e.target.value))} className="ml-2 w-20" />
          <button onClick={() => setErase(false)} className={`rounded-lg p-1.5 ${!erase ? 'bg-brand-soft text-brand' : 'text-ink-soft'}`}><Pencil className="h-4 w-4" /></button>
          <button onClick={() => setErase(true)} className={`rounded-lg p-1.5 ${erase ? 'bg-brand-soft text-brand' : 'text-ink-soft'}`}><Eraser className="h-4 w-4" /></button>
          <button onClick={clear} className="rounded-lg p-1.5 text-coral"><Trash2 className="h-4 w-4" /></button>
        </div>
      )}
      <canvas ref={canvasRef} width={900} height={520}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up}
        className="w-full cursor-crosshair rounded-xl border border-gray-100 bg-white touch-none" />
      {!canDraw && <p className="mt-2 text-center text-xs text-ink-soft">Watching the teacher’s whiteboard live</p>}
    </div>
  );
}
