import crypto from 'node:crypto';
import { Types } from 'mongoose';
import { NotFoundError } from '../../core/errors.js';
import { bus } from '../../core/eventBus.js';
import { config } from '../../config/index.js';
import { SessionModel } from './session.model.js';
import { livekit } from './providers/livekit.js';

/**
 * Live classroom sessions backed by LiveKit (WebRTC SFU): join tokens, recording via Egress,
 * and a `session.ended` event that triggers the AI Class Assistant (transcript→summary→notes).
 */
export const sessionService = {
  async create(tenantId: string, tutorId: string, data: { bookingId?: string; title?: string; priceGHS?: number; isPeer?: boolean; subject?: string; hostName?: string; level?: string; programme?: string }) {
    const sfuRoom = 'room_' + crypto.randomBytes(6).toString('hex');
    return SessionModel.create({
      tenantId: new Types.ObjectId(tenantId), tutorId: new Types.ObjectId(tutorId),
      bookingId: data.bookingId, title: data.title, status: 'scheduled', sfuRoom,
      priceGHS: data.priceGHS ?? 0, isPeer: data.isPeer ?? false, subject: data.subject, hostName: data.hostName, level: data.level ?? 'Any', programme: data.programme,
    });
  },

  async join(tenantId: string, sessionId: string, userId: string, role: string) {
    const session = await SessionModel.findOne({ _id: sessionId, tenantId });
    if (!session) throw new NotFoundError('Session not found');

    const isHost = role === 'teacher' || role === 'school_admin';
    if (session.status === 'scheduled' && isHost) {
      session.status = 'live';
      session.startedAt = new Date();
      const egressId = await livekit.startRecording(session.sfuRoom!);
      session.recording = { egressId: egressId ?? undefined, status: egressId ? 'recording' : 'none', url: undefined };
    }
    session.participants.push({ userId: new Types.ObjectId(userId), joinedAt: new Date() } as never);
    await session.save();

    const token = await livekit.createToken({ room: session.sfuRoom!, identity: userId, canPublish: isHost });
    return { url: config.livekit.url, token, room: session.sfuRoom, sessionId: String(session._id) };
  },

  async end(tenantId: string, sessionId: string) {
    const session = await SessionModel.findOne({ _id: sessionId, tenantId });
    if (!session) throw new NotFoundError('Session not found');
    if (session.recording?.egressId) {
      await livekit.stopRecording(session.recording.egressId);
      session.recording.status = 'processing';
    }
    session.status = 'ended';
    session.endedAt = new Date();
    await session.save();
    await bus.publish('session.ended', { sessionId, sfuRoom: session.sfuRoom }, { tenantId });
    return session;
  },

  async replay(tenantId: string, sessionId: string) {
    const session = await SessionModel.findOne({ _id: sessionId, tenantId });
    if (!session) throw new NotFoundError('Session not found');
    return {
      recordingUrl: session.recording?.url ?? null,
      transcriptUrl: session.transcript?.url ?? null,
      aiSummary: session.aiSummary ?? null,
      keyPoints: session.keyPoints ?? [],
      chapters: session.chapters ?? [],
      unansweredQuestions: session.unansweredQuestions ?? [],
      durationMs: session.endedAt && session.startedAt
        ? session.endedAt.getTime() - session.startedAt.getTime() : null,
    };
  },

  list(tenantId: string) {
    return SessionModel.find({ tenantId }).sort({ createdAt: -1 }).limit(50);
  },
};
