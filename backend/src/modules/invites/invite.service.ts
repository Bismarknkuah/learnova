import crypto from 'node:crypto';
import { ConflictError } from '../../core/errors.js';
import { InviteModel } from './invite.model.js';
import { UserModel } from '../users/user.model.js';
import type { AuthUser } from '@learnova/shared';

const TTL_DAYS = 14;

export const inviteService = {
  /** Admin creates an invite for someone to join their school. Returns a shareable token. */
  async create(actor: AuthUser, input: { email: string; role: string }) {
    const email = input.email.toLowerCase().trim();
    const existing = await UserModel.findOne({ tenantId: actor.tenantId, email });
    if (existing) throw new ConflictError('A user with that email is already in your school');

    const token = crypto.randomBytes(24).toString('hex');
    const invite = await InviteModel.create({
      tenantId: actor.tenantId, email, role: input.role, token,
      invitedBy: actor.id, expiresAt: new Date(Date.now() + TTL_DAYS * 864e5),
    });
    return { id: String(invite._id), email, role: invite.role, token, status: invite.status, expiresAt: invite.expiresAt };
  },

  /** Admin lists pending/accepted invites for their school. */
  async list(actor: AuthUser) {
    return InviteModel.find({ tenantId: actor.tenantId }).sort({ createdAt: -1 }).limit(200)
      .select('email role status expiresAt createdAt token');
  },

  async revoke(actor: AuthUser, id: string) {
    await InviteModel.updateOne({ _id: id, tenantId: actor.tenantId }, { status: 'revoked' });
    return { id, status: 'revoked' };
  },

  /** Look up a valid invite by token (for the public accept page). */
  async byToken(token: string) {
    return InviteModel.findOne({ token, status: 'pending', expiresAt: { $gt: new Date() } });
  },
};
