'use client';
import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/** Connects to the classroom realtime room ONCE per session and exposes the socket.
 *  The display name is read from a ref so a late-loading name never tears down the socket
 *  (which previously orphaned all event listeners and broke polls/quiz/chat). */
export function useClassroomSocket(sessionId: string, displayName: string) {
  const ref = useRef<Socket | null>(null);
  const nameRef = useRef(displayName);
  nameRef.current = displayName;
  const [, bump] = useState(0); // re-render once connected so listener effects can settle

  useEffect(() => {
    const socket = io(API, { transports: ['websocket', 'polling'] });
    ref.current = socket;
    socket.on('connect', () => { socket.emit('classroom:join', { sessionId, displayName: nameRef.current }); bump((n) => n + 1); });
    return () => { socket.disconnect(); ref.current = null; };
  }, [sessionId]);

  return ref;
}
