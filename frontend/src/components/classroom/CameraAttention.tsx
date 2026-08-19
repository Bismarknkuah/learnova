'use client';
import { useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { Camera, CameraOff, ShieldCheck } from 'lucide-react';

/**
 * OPT-IN camera attention. Runs face detection entirely on-device (TensorFlow.js BlazeFace);
 * only an attention LEVEL ('engaged' | 'away') is sent over the socket — never any video or image.
 * The student can stop it at any time.
 */
export function CameraAttention({ socket, sessionId }: { socket: Socket | null; sessionId: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [level, setLevel] = useState<'engaged' | 'away' | 'starting'>('starting');

  useEffect(() => {
    let stop = false; let timer: ReturnType<typeof setInterval> | undefined;
    (async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } }).catch(() => null);
      if (!stream || stop) return;
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      try {
        const [tf, blazeface] = await Promise.all([import('@tensorflow/tfjs'), import('@tensorflow-models/blazeface')]);
        await tf.ready();
        const model = await blazeface.load();
        if (stop) return;
        timer = setInterval(async () => {
          const v = videoRef.current; if (!v || v.readyState < 2) return;
          try {
            const faces = await model.estimateFaces(v, false);
            // Attentive ≈ exactly one face, occupying a reasonable area (facing the screen).
            let lvl: 'engaged' | 'away' = 'away';
            if (faces.length === 1) {
              const [x1, y1] = faces[0].topLeft as [number, number];
              const [x2, y2] = faces[0].bottomRight as [number, number];
              const area = Math.abs((x2 - x1) * (y2 - y1));
              lvl = area > 4000 ? 'engaged' : 'away';
            }
            setLevel(lvl);
            socket?.emit('attention:update', { sessionId, level: lvl });
          } catch { /* skip frame */ }
        }, 3000);
      } catch { setLevel('away'); }
    })();
    return () => { stop = true; if (timer) clearInterval(timer); streamRef.current?.getTracks().forEach((t) => t.stop()); };
  }, [socket, sessionId]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3">
      <div className="flex items-center justify-between">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
          {level === 'engaged' ? <Camera className="h-4 w-4 text-brand" /> : <CameraOff className="h-4 w-4 text-gold-dark" />}
          Attention: {level === 'starting' ? 'starting…' : level}
        </p>
        <span className="inline-flex items-center gap-1 text-xs text-ink-soft"><ShieldCheck className="h-3.5 w-3.5 text-brand" /> on-device only</span>
      </div>
      <video ref={videoRef} autoPlay muted playsInline className="mt-2 h-20 w-full rounded-lg bg-black object-cover opacity-80" />
      <p className="mt-1 text-xs text-ink-soft">Your video never leaves your device — only an attention level is shared with your teacher.</p>
    </div>
  );
}
