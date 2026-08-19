import { Types } from 'mongoose';
import { NotFoundError } from '../../core/errors.js';
import { UserModel } from './user.model.js';

export const userService = {
  async me(userId: string) {
    const u = await UserModel.findById(userId);
    if (!u) throw new NotFoundError('User not found');
    return u;
  },

  async updateProfile(userId: string, patch: Record<string, unknown>) {
    const u = await UserModel.findByIdAndUpdate(userId, patch, { new: true });
    if (!u) throw new NotFoundError('User not found');
    return u;
  },

  /** Parent links to a child account (must be in the same tenant). Enables the Parent Portal. */
  async linkChild(tenantId: string, parentId: string, childId: string) {
    const child = await UserModel.findOne({ _id: childId, tenantId, role: 'student' });
    if (!child) throw new NotFoundError('Student not found in this tenant');
    child.guardianId = new Types.ObjectId(parentId) as never;
    if (child.isMinor) child.consentGivenAt = new Date(); // guardian consent
    await child.save();
    return { linked: true, childId };
  },

  async children(tenantId: string, parentId: string) {
    return UserModel.find({ tenantId, guardianId: parentId, role: 'student' }).select('name email status lastLoginAt');
  },
};
