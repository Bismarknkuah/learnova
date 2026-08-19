'use client';
import { useEffect, useRef, useState, useCallback } from 'react';

export interface ProctorEvent { type: string; at: string; severity: 'low' | 'medium' | 'high' }

/**
 * On-device exam proctoring — runs entirely in the browser, no video leaves the device.
 * Behavioural signals (no model): tab switch, window blur, leaving fullscreen, copy/paste.
 * AI vision signals (TensorFlow.js, loaded in-browser): multiple faces / no face (BlazeFace)
 * and phone usage (coco-ssd object detection). Models load lazily; if they fail to load the
 * behavioural checks still work.
 */
export function useProctoring(active: boolean) {
  const [events, setEvents] = useState<ProctorEvent[]>([]);
  const [aiReady, setAiReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastFlag = useRef<Record<string, number>>({});

  const push = useCallback((type: string, severity: ProctorEvent['severity']) => {
    // Debounce repeated vision flags to once per 4s.
    const now = Date.now();
    if (lastFlag.current[type] && now - lastFlag.current[type] < 4000) return;
    lastFlag.current[type] = now;
    setEvents((e) => [...e, { type, at: new Date().toISOString(), severity }]);
  }, []);

  useEffect(() => {
    if (!active) return;
    const onVisibility = () => { if (document.hidden) push('tab_hidden', 'medium'); };
    const onBlur = () => push('window_blur', 'medium');
    const onFullscreen = () => { if (!document.fullscreenElement) push('exited_fullscreen', 'medium'); };
    const onCopy = () => push('copy', 'high');
    const onPaste = () => push('paste', 'high');
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    document.addEventListener('fullscreenchange', onFullscreen);
    document.addEventListener('copy', onCopy);
    document.addEventListener('paste', onPaste);

    let stop = false; let raf: number | undefined; let timer: ReturnType<typeof setInterval> | undefined;

    (async () => {
      const stream = await navigator.mediaDevices?.getUserMedia({ video: true }).catch(() => null);
      if (!stream) { push('camera_denied', 'low'); return; }
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;

      try {
        const [tf, blazeface, cocoSsd] = await Promise.all([
          import('@tensorflow/tfjs'),
          import('@tensorflow-models/blazeface'),
          import('@tensorflow-models/coco-ssd'),
        ]);
        await tf.ready();
        const faceModel = await blazeface.load();
        const objModel = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
        if (stop) return;
        setAiReady(true);

        // Run vision checks ~ every 1.5s.
        timer = setInterval(async () => {
          const v = videoRef.current; if (!v || v.readyState < 2) return;
          try {
            const faces = await faceModel.estimateFaces(v, false);
            if (faces.length === 0) push('no_face', 'medium');
            else if (faces.length > 1) push('multiple_faces', 'high');

            const objs = await objModel.detect(v);
            if (objs.some((o) => o.class === 'cell phone' && o.score > 0.5)) push('phone_detected', 'high');
          } catch { /* frame skipped */ }
        }, 1500);
      } catch {
        // Models couldn't load — behavioural proctoring still active.
        setAiReady(false);
      }
    })();

    return () => {
      stop = true;
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('fullscreenchange', onFullscreen);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('paste', onPaste);
      if (raf) cancelAnimationFrame(raf);
      if (timer) clearInterval(timer);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [active, push]);

  const enterFullscreen = useCallback(() => document.documentElement.requestFullscreen?.().catch(() => {}), []);
  const riskScore = events.reduce((s, e) => s + ({ low: 1, medium: 3, high: 6 })[e.severity], 0);

  return { events, riskScore, videoRef, enterFullscreen, aiReady };
}
