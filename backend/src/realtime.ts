import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { config } from './config/index.js';
import { bus } from './core/eventBus.js';
import { logger } from './core/logger.js';

/** Socket.IO backbone for the live classroom: presence, chat, whiteboard, reactions, polls. */
let ioRef: Server | null = null;
export function getIO(): Server | null { return ioRef; }

export function attachRealtime(httpServer: HttpServer): Server {
  const quizAnswers = new Map<string, number>(); // sessionId -> correct index
  const io = new Server(httpServer, { cors: { origin: config.corsOrigin } });
  ioRef = io;
  const room = (sessionId: string) => `session:${sessionId}`;

  io.on('connection', (socket) => {
    let name = 'Guest';
    socket.on('identify', ({ userId }: { userId: string }) => { if (userId) socket.join(`user:${userId}`); });

    socket.on('classroom:join', ({ sessionId, displayName }: { sessionId: string; displayName?: string }) => {
      name = displayName ?? 'Guest';
      socket.join(room(sessionId));
      socket.to(room(sessionId)).emit('presence:joined', { id: socket.id, name });
    });

    // Chat (public)
    socket.on('chat:message', ({ sessionId, msg, replyTo, breakout }: { sessionId: string; msg: string; replyTo?: number; breakout?: string }) => {
      const target = breakout ? `${room(sessionId)}:b${breakout}` : room(sessionId);
      io.to(target).emit('chat:message', { id: socket.id, name, msg, replyTo, ts: Date.now() });
    });

    // Raise hand
    socket.on('hand:raise', ({ sessionId }: { sessionId: string }) => {
      io.to(room(sessionId)).emit('hand:raised', { id: socket.id, name });
    });

    // Emoji reactions
    socket.on('react:emoji', ({ sessionId, emoji }: { sessionId: string; emoji: string }) => {
      io.to(room(sessionId)).emit('react:emoji', { id: socket.id, emoji, ts: Date.now() });
    });

    // Opt-in camera attention signal (on-device face detection — only a level is sent, never video)
    socket.on('attention:update', ({ sessionId, level }: { sessionId: string; level: string }) => {
      socket.to(room(sessionId)).emit('attention:update', { id: socket.id, level, ts: Date.now() });
    });

    // Teacher moderator controls: nudge students to unmute / show camera / present.
    socket.on('moderator:request', ({ sessionId, action, target }: { sessionId: string; action: string; target?: string }) => {
      if (target) io.to(target).emit('moderator:request', { action });
      else socket.to(room(sessionId)).emit('moderator:request', { action });
    });

    // Collaborative whiteboard — relay each stroke to everyone else in the room
    socket.on('wb:stroke', ({ sessionId, stroke }: { sessionId: string; stroke: unknown }) => {
      socket.to(room(sessionId)).emit('wb:stroke', stroke);
    });
    socket.on('wb:clear', ({ sessionId }: { sessionId: string }) => {
      io.to(room(sessionId)).emit('wb:clear');
    });

    // Live polls
    socket.on('poll:start', ({ sessionId, question, options }: { sessionId: string; question: string; options: string[] }) => {
      io.to(room(sessionId)).emit('poll:start', { question, options, votes: options.map(() => 0) });
    });
    socket.on('poll:vote', ({ sessionId, index }: { sessionId: string; index: number }) => {
      io.to(room(sessionId)).emit('poll:vote', { index });
    });

    // ---- Live quizzes (graded; correct answer kept server-side) ----
    socket.on('quiz:start', ({ sessionId, question, options, answer }: { sessionId: string; question: string; options: string[]; answer: number }) => {
      quizAnswers.set(sessionId, answer);
      io.to(room(sessionId)).emit('quiz:start', { question, options }); // answer NOT sent
    });
    socket.on('quiz:answer', ({ sessionId, index }: { sessionId: string; index: number }) => {
      const correct = quizAnswers.get(sessionId);
      socket.emit('quiz:result', { correct: index === correct, answer: correct });
      io.to(room(sessionId)).emit('quiz:tally', { index });
    });
    socket.on('quiz:reveal', ({ sessionId }: { sessionId: string }) => {
      io.to(room(sessionId)).emit('quiz:reveal', { answer: quizAnswers.get(sessionId) });
    });

    // ---- Breakout rooms (socket sub-rooms within the class) ----
    socket.on('breakout:open', ({ sessionId, rooms }: { sessionId: string; rooms: string[] }) => {
      io.to(room(sessionId)).emit('breakout:open', { rooms });
    });
    socket.on('breakout:join', ({ sessionId, breakout }: { sessionId: string; breakout: string }) => {
      const main = room(sessionId);
      for (const r of [...socket.rooms]) if (r.startsWith(main + ':b')) socket.leave(r);
      socket.join(`${main}:b${breakout}`);
      socket.emit('breakout:joined', { breakout });
    });
    socket.on('breakout:close', ({ sessionId }: { sessionId: string }) => io.to(room(sessionId)).emit('breakout:close'));

    // ---- Private (direct) messages between participants ----
    socket.on('dm:send', ({ to, msg }: { to: string; msg: string }) => {
      io.to(to).emit('dm:message', { from: socket.id, name, msg, ts: Date.now() });
    });

    // ---- WebRTC signaling (internal HD video/screen-share, no media server for small classes) ----
    socket.on('rtc:join', async ({ sessionId }: { sessionId: string }) => {
      socket.join(room(sessionId));
      const peers = [...(await io.in(room(sessionId)).allSockets())].filter((sid) => sid !== socket.id);
      socket.emit('rtc:peers', { peers });                       // existing peers to call
      socket.to(room(sessionId)).emit('rtc:peer-joined', { id: socket.id, name });
    });
    // Relay SDP offers/answers and ICE candidates to a specific peer.
    socket.on('rtc:signal', ({ to, data }: { to: string; data: unknown }) => {
      io.to(to).emit('rtc:signal', { from: socket.id, name, data });
    });

    // ---- Voice notes + file sharing (browser-recorded/encoded, relayed in-band) ----
    socket.on('chat:voice', ({ sessionId, audio, dur }: { sessionId: string; audio: string; dur: number }) => {
      io.to(room(sessionId)).emit('chat:voice', { id: socket.id, name, audio, dur, ts: Date.now() });
    });
    socket.on('chat:file', ({ sessionId, file, fileName, mime }: { sessionId: string; file: string; fileName: string; mime: string }) => {
      io.to(room(sessionId)).emit('chat:file', { id: socket.id, name, file, fileName, mime, ts: Date.now() });
    });

    socket.on('disconnecting', () => {
      for (const r of socket.rooms) if (r.startsWith('session:')) socket.to(r).emit('rtc:peer-left', { id: socket.id });
    });
  });

  // Bridge agent answers to the relevant classroom in real time.
  bus.subscribe('tutor.answer.ready', (event) => {
    const sid = event.meta.sessionId;
    if (sid) io.to(room(sid)).emit('tutor:answer', event.payload);
  });

  logger.info('realtime attached');
  return io;
}
