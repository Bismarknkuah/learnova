import { AccessToken, EgressClient, type EncodedFileOutput } from 'livekit-server-sdk';
import { config } from '../../../config/index.js';
import { logger } from '../../../core/logger.js';

const configured = () => Boolean(config.livekit.apiKey && config.livekit.apiSecret);

/**
 * LiveKit integration for the live classroom.
 * - join tokens: signed JWT granting a participant access to a room
 * - recording: Room Composite Egress writes an MP4 to object storage
 * Falls back gracefully (dev) when keys aren't set so the rest of the flow still works.
 */
export const livekit = {
  configured,

  /** Mint a participant access token with role-appropriate grants. */
  async createToken(args: { room: string; identity: string; name?: string; canPublish: boolean }): Promise<string> {
    if (!configured()) {
      // Dev fallback so classroom flows are testable without a LiveKit server.
      return `dev-token:${args.room}:${args.identity}`;
    }
    const at = new AccessToken(config.livekit.apiKey, config.livekit.apiSecret, {
      identity: args.identity,
      name: args.name,
      ttl: '2h',
    });
    at.addGrant({
      roomJoin: true,
      room: args.room,
      canPublish: args.canPublish,
      canSubscribe: true,
      canPublishData: true,
    });
    return at.toJwt();
  },

  /** Start recording a room; returns the egressId to stop it later. */
  async startRecording(room: string): Promise<string | null> {
    if (!configured()) { logger.info({ room }, 'livekit recording skipped (no keys)'); return null; }
    const client = new EgressClient(config.livekit.url, config.livekit.apiKey, config.livekit.apiSecret);
    const output: EncodedFileOutput = {
      filepath: `recordings/${room}-{time}.mp4`,
    } as EncodedFileOutput;
    const info = await client.startRoomCompositeEgress(room, { file: output });
    return info.egressId;
  },

  async stopRecording(egressId: string): Promise<void> {
    if (!configured() || !egressId) return;
    const client = new EgressClient(config.livekit.url, config.livekit.apiKey, config.livekit.apiSecret);
    await client.stopEgress(egressId);
  },
};
