import { Types } from 'mongoose';
import { ForbiddenError, NotFoundError } from '../../core/errors.js';
import { UserModel } from '../users/user.model.js';
import { TenantModel } from '../tenants/tenant.model.js';
import { BookingModel } from '../bookings/booking.model.js';
import { ProductModel } from '../marketplace/product.model.js';
import { agentSystem } from '../../agents/index.js';
import type { AuthUser } from '@learnova/shared';

const isSuper = (a: AuthUser) => a.role === 'super_admin';

export const adminService = {
  /** List users. super_admin sees all tenants; school_admin sees only their tenant. */
  async listUsers(actor: AuthUser, q: { role?: string; status?: string } = {}) {
    const filter: Record<string, unknown> = { deletedAt: null };
    if (!isSuper(actor)) filter.tenantId = actor.tenantId;
    if (q.role) filter.role = q.role;
    if (q.status) filter.status = q.status;
    return UserModel.find(filter).select('name email role status lastLoginAt createdAt tenantId').sort({ createdAt: -1 }).limit(500);
  },

  /** Suspend or reactivate a user. Cannot target yourself or a super_admin. */
  async setStatus(actor: AuthUser, userId: string, status: 'active' | 'suspended') {
    if (userId === actor.id) throw new ForbiddenError('You cannot change your own status');
    const target = await UserModel.findById(userId);
    if (!target) throw new NotFoundError('User not found');
    if (!isSuper(actor) && String(target.tenantId) !== actor.tenantId) throw new ForbiddenError('Outside your tenant');
    if (target.role === 'super_admin') throw new ForbiddenError('Cannot modify a super admin');
    target.status = status;
    await target.save();
    return { id: userId, status };
  },

  /** Change a user's role. super_admin only. */
  async setRole(actor: AuthUser, userId: string, role: string) {
    if (!isSuper(actor)) throw new ForbiddenError('Only a super admin can change roles');
    if (userId === actor.id) throw new ForbiddenError('You cannot change your own role');
    const target = await UserModel.findByIdAndUpdate(userId, { role }, { new: true });
    if (!target) throw new NotFoundError('User not found');
    return { id: userId, role };
  },

  /** Platform overview. super_admin: across all tenants; school_admin: own tenant. */
  async overview(actor: AuthUser) {
    const scope: Record<string, unknown> = isSuper(actor) ? {} : { tenantId: new Types.ObjectId(actor.tenantId) };
    const [students, teachers, admins, bookings, products, tenants] = await Promise.all([
      UserModel.countDocuments({ ...scope, role: 'student', deletedAt: null }),
      UserModel.countDocuments({ ...scope, role: 'teacher', deletedAt: null }),
      UserModel.countDocuments({ ...scope, role: { $in: ['school_admin', 'super_admin'] }, deletedAt: null }),
      BookingModel.countDocuments({ ...scope, deletedAt: null }),
      ProductModel.countDocuments({ ...scope, deletedAt: null }),
      isSuper(actor) ? TenantModel.countDocuments({ deletedAt: null }) : Promise.resolve(1),
    ]);
    return { scope: isSuper(actor) ? 'platform' : 'tenant', students, teachers, admins, bookings, products, tenants };
  },

  /** Live multi-agent system status. */
  agents() {
    return agentSystem.status();
  },
};
