import { AccessToken, RoomServiceClient, EgressClient, EncodedFileType, EncodedFileOutput } from 'livekit-server-sdk';
import { config } from '../../config/index.js';
import { logger } from '../../core/logger.js';

const hasKeys = Boolean(config.livekit.apiKey && config.livekit.apiSecret);
const httpUrl = config.livekit.url.replace(/^ws/, 'http');

const roomService = hasKeys ? new RoomServiceClient(httpUrl, config.livekit.apiKey, config.livekit.apiSecret) : null;
const egressClient = hasKeys ? new EgressClient(httpUrl, config.livekit.apiKey, config.livekit.apiSecret) : null;

export const livekit = {
  enabled: hasKeys,

  /** Mint a real LiveKit access token scoped to one room + identity, with role-based grants. */
  async createToken(opts: { room: string; identity: string; name?: string; canPublish: boolean }): Promise<string> {
    if (!hasKeys) return `dev-token:${opts.room}:${opts.identity}`; // dev fallback
    const at = new AccessToken(config.livekit.apiKey, config.livekit.apiSecret, {
      identity: opts.identity,
      name: opts.name,
      ttl: '2h',
    });
    at.addGrant({
      room: opts.room,
      roomJoin: true,
      canPublish: opts.canPublish,        // teachers publish; students can be granted later
      canPublishData: true,
      canSubscribe: true,
    });
    return at.toJwt();
  },

  async ensureRoom(room: string): Promise<void> {
    if (!roomService) return;
    try { await roomService.createRoom({ name: room, emptyTimeout: 600, maxParticipants: 200 }); }
    catch (err) { logger.debug({ err: (err as Error).message }, 'room exists or create skipped'); }
  },

  async deleteRoom(room: string): Promise<void> {
    if (!roomService) return;
    try { await roomService.deleteRoom(room); } catch { /* noop */ }
  },

  /** Start recording the room to object storage via LiveKit Egress; returns an egressId. */
  async startRecording(room: string): Promise<string | null> {
    if (!egressClient) return null;
    const info = await egressClient.startRoomCompositeEgress(room, new EncodedFileOutput({
      fileType: EncodedFileType.MP4,
      filepath: `recordings/${room}-{time}.mp4`,
    }));
    return info.egressId;
  },

  async stopRecording(egressId: string): Promise<void> {
    if (!egressClient || !egressId) return;
    try { await egressClient.stopEgress(egressId); } catch { /* noop */ }
  },
};
