import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../../config/index.js';
import { AuthError, ConflictError, NotFoundError } from '../../core/errors.js';
import { bus } from '../../core/eventBus.js';
import { UserModel, userSchema, type UserDoc, type User } from '../users/user.model.js';
import { TenantModel } from '../tenants/tenant.model.js';
import { getTenantConnection, tenantModel } from '../../core/tenantDb.js';
import { InviteModel } from '../invites/invite.model.js';
import type { RegisterInput, LoginInput } from './auth.validation.js';
import type { AuthUser } from '@learnova/shared';

function isMinor(dob?: Date): boolean {
  if (!dob) return false;
  const age = (Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000);
  return age < 18;
}

function tokensFor(user: UserDoc, tenantSlug?: string): { accessToken: string; refreshToken: string } {
  const claims = { sub: String(user._id), role: user.role, tenantId: String(user.tenantId), tenantSlug };
  return {
    accessToken: jwt.sign(claims, config.jwt.accessSecret, { expiresIn: config.jwt.accessTtl as any }),
    refreshToken: jwt.sign({ sub: claims.sub, typ: 'refresh', tenantSlug }, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshTtl as any,
    }),
  };
}

/** The User model bound to a specific school's database (per-tenant in 'database' isolation mode). */
function userModelFor(slug: string) {
  return tenantModel<User>(slug, 'User', userSchema) as unknown as typeof UserModel;
}

export const authService = {
  async register(input: RegisterInput) {
    const tenant = await TenantModel.findOne({ slug: input.tenantSlug, deletedAt: null });
    if (!tenant) throw new NotFoundError('Tenant not found');

    const Users = userModelFor(tenant.slug);
    const email = input.email.toLowerCase().trim();
    // Only match on phone when one was actually supplied — otherwise { phone: undefined }
    // matches every existing account that has no phone, falsely reporting "user already exists".
    const or: Record<string, unknown>[] = [{ email }];
    if (input.phone) or.push({ phone: input.phone });
    const existing = await Users.findOne({ tenantId: tenant._id, $or: or });
    if (existing) throw new ConflictError('An account with that email or phone already exists');

    const passwordHash = await bcrypt.hash(input.password, 10);
    const minor = isMinor(input.dateOfBirth);
    const user = await Users.create({
      tenantId: tenant._id,
      role: input.role,
      name: input.name,
      email,
      phone: input.phone,
      passwordHash,
      dateOfBirth: input.dateOfBirth,
      educationLevel: input.educationLevel,
      subjects: input.subjects ?? [],
      isMinor: minor,
      status: minor ? 'pending' : 'active', // minors need guardian consent
    });

    await bus.publish('user.registered', { userId: String(user._id), role: user.role }, {
      tenantId: String(tenant._id),
    });

    return { user: this.sanitize(user), ...tokensFor(user, tenant.slug) };
  },

  /**
   * Self-service school onboarding (SaaS rental). Creates a new isolated school tenant and
   * its first school-admin, then signs them in. In 'database' isolation mode the school also
   * gets its own dedicated MongoDB database (provisioned lazily on first use).
   */
  async registerSchool(input: { schoolName: string; slug: string; adminName: string; email: string; password: string; phone?: string }) {
    const slug = input.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    if (await TenantModel.findOne({ slug })) throw new ConflictError('That school address is already taken');

    const tenant = await TenantModel.create({ name: input.schoolName, slug, type: 'school', plan: 'free' });

    const passwordHash = await bcrypt.hash(input.password, 10);
    // In 'database' mode this writes the admin into the school's OWN database (learnova_<slug>).
    const admin = await userModelFor(slug).create({
      tenantId: tenant._id, role: 'school_admin', name: input.adminName,
      email: input.email, phone: input.phone, passwordHash, status: 'active',
    });

    await bus.publish('school.registered', { tenantId: String(tenant._id), slug }, { tenantId: String(tenant._id) });
    return { tenant: { id: String(tenant._id), name: tenant.name, slug }, user: this.sanitize(admin), ...tokensFor(admin, slug) };
  },

  /** Accept a school invite: creates the user in that school with the invited role, then signs in. */
  async acceptInvite(input: { token: string; name: string; password: string; phone?: string }) {
    const invite = await InviteModel.findOne({ token: input.token, status: 'pending', expiresAt: { $gt: new Date() } });
    if (!invite) throw new NotFoundError('This invite is invalid or has expired');

    const tenant = await TenantModel.findById(invite.tenantId);
    if (!tenant) throw new NotFoundError('School not found');
    const Users = userModelFor(tenant.slug);
    const existing = await Users.findOne({ tenantId: invite.tenantId, email: invite.email });
    if (existing) throw new ConflictError('You already have an account in this school');

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await Users.create({
      tenantId: invite.tenantId, role: invite.role, name: input.name,
      email: invite.email, phone: input.phone, passwordHash, status: 'active',
    });
    invite.status = 'accepted';
    await invite.save();

    await bus.publish('invite.accepted', { userId: String(user._id), role: user.role }, { tenantId: String(invite.tenantId) });
    return { user: this.sanitize(user), ...tokensFor(user, tenant.slug) };
  },

  async login(input: LoginInput) {
    const tenant = await TenantModel.findOne({ slug: input.tenantSlug, deletedAt: null });
    if (!tenant) throw new AuthError('Invalid credentials');

    const user = await userModelFor(tenant.slug).findOne({
      tenantId: tenant._id,
      $or: [{ email: input.identifier.toLowerCase() }, { phone: input.identifier }],
      deletedAt: null,
    }).select('+passwordHash');
    if (!user) throw new AuthError('Invalid credentials');

    const okPw = await bcrypt.compare(input.password, user.passwordHash);
    if (!okPw) throw new AuthError('Invalid credentials');

    // If MFA is enabled, defer issuing tokens until the TOTP code is verified.
    if (user.mfaEnabled) {
      const mfaToken = jwt.sign({ sub: String(user._id), tenantSlug: tenant.slug, typ: 'mfa' }, config.jwt.accessSecret, { expiresIn: '5m' });
      return { mfaRequired: true, mfaToken };
    }
    user.lastLoginAt = new Date();
    await user.save();
    return { user: this.sanitize(user), ...tokensFor(user, tenant.slug) };
  },

  // ---- MFA (TOTP) ----
  async mfaSetup(authUser: AuthUser) {
    const slug = authUser.tenantSlug;
    const Model = slug ? userModelFor(slug) : UserModel;
    const user = await Model.findById(authUser.id).select('+mfaSecret');
    if (!user) throw new AuthError('User not found');
    const secret = authenticator.generateSecret();
    user.mfaSecret = secret; await user.save();
    const otpauth = authenticator.keyuri(user.email ?? authUser.id, 'Learnova', secret);
    return { otpauth, secret };
  },
  async mfaEnable(authUser: AuthUser, code: string) {
    const slug = authUser.tenantSlug;
    const Model = slug ? userModelFor(slug) : UserModel;
    const user = await Model.findById(authUser.id).select('+mfaSecret');
    if (!user?.mfaSecret) throw new AuthError('Run MFA setup first');
    if (!authenticator.verify({ token: code, secret: user.mfaSecret })) throw new AuthError('Invalid code');
    user.mfaEnabled = true; await user.save();
    return { enabled: true };
  },
  async mfaDisable(authUser: AuthUser, code: string) {
    const slug = authUser.tenantSlug;
    const Model = slug ? userModelFor(slug) : UserModel;
    const user = await Model.findById(authUser.id).select('+mfaSecret');
    if (!user?.mfaSecret || !authenticator.verify({ token: code, secret: user.mfaSecret })) throw new AuthError('Invalid code');
    user.mfaEnabled = false; user.mfaSecret = undefined; await user.save();
    return { enabled: false };
  },
  async mfaLogin(mfaToken: string, code: string) {
    let payload: { sub: string; tenantSlug?: string; typ?: string };
    try { payload = jwt.verify(mfaToken, config.jwt.accessSecret) as typeof payload; }
    catch { throw new AuthError('MFA session expired — please log in again'); }
    if (payload.typ !== 'mfa') throw new AuthError('Invalid MFA token');
    const Model = payload.tenantSlug ? userModelFor(payload.tenantSlug) : UserModel;
    const user = await Model.findById(payload.sub).select('+mfaSecret');
    if (!user?.mfaSecret || !authenticator.verify({ token: code, secret: user.mfaSecret })) throw new AuthError('Invalid code');
    user.lastLoginAt = new Date(); await user.save();
    return { user: this.sanitize(user), ...tokensFor(user, payload.tenantSlug) };
  },

  // ---- Google OAuth ----
  async googleLogin(credential: string, tenantSlug: string) {
    if (!config.oauth?.googleClientId) throw new AuthError('Google sign-in is not configured (set GOOGLE_CLIENT_ID).');
    const client = new OAuth2Client(config.oauth.googleClientId);
    const ticket = await client.verifyIdToken({ idToken: credential, audience: config.oauth.googleClientId });
    const p = ticket.getPayload();
    if (!p?.email) throw new AuthError('Google account has no email');
    const tenant = await TenantModel.findOne({ slug: tenantSlug, deletedAt: null });
    if (!tenant) throw new AuthError('Unknown tenant');
    const Model = userModelFor(tenant.slug);
    let user = await Model.findOne({ tenantId: tenant._id, email: p.email.toLowerCase() });
    if (!user) {
      user = await Model.create({ tenantId: tenant._id, email: p.email.toLowerCase(), name: p.name ?? p.email, role: 'student', googleId: p.sub, avatarUrl: p.picture });
    } else if (!user.googleId) { user.googleId = p.sub; await user.save(); }
    if (user.mfaEnabled) {
      const mfaToken = jwt.sign({ sub: String(user._id), tenantSlug: tenant.slug, typ: 'mfa' }, config.jwt.accessSecret, { expiresIn: '5m' });
      return { mfaRequired: true, mfaToken };
    }
    return { user: this.sanitize(user), ...tokensFor(user, tenant.slug) };
  },

  async refresh(refreshToken: string) {
    try {
      const claims = jwt.verify(refreshToken, config.jwt.refreshSecret) as { sub: string; tenantSlug?: string };
      const Users = claims.tenantSlug ? userModelFor(claims.tenantSlug) : UserModel;
      const user = await Users.findById(claims.sub);
      if (!user) throw new AuthError();
      return tokensFor(user, claims.tenantSlug);
    } catch {
      throw new AuthError('Invalid refresh token');
    }
  },

  async me(authUser: AuthUser) {
    const Users = authUser.tenantSlug ? userModelFor(authUser.tenantSlug) : UserModel;
    const user = await Users.findById(authUser.id);
    if (!user) throw new NotFoundError('User not found');
    return this.sanitize(user);
  },

  sanitize(user: UserDoc) {
    const o = user.toObject();
    delete (o as Record<string, unknown>).passwordHash;
    return o;
  },
};
