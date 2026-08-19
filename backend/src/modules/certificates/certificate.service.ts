import crypto from 'node:crypto';
import { Types } from 'mongoose';
import { NotFoundError } from '../../core/errors.js';
import { CertificateModel } from './certificate.model.js';
import { anchor } from './anchor.js';

/**
 * Issues a certificate: hashes the document (sha256) and stores an anchor record. Only the
 * HASH would go on-chain in production (cheap + privacy-safe) — the document stays off-chain.
 * verifyCode is encoded into the QR for public verification.
 */
export const certificateService = {
  async issue(tenantId: string, issuedBy: string, data: { studentId: string; title: string; documentUrl?: string; documentContent?: string }) {
    const sha256 = crypto.createHash('sha256')
      .update(data.documentContent ?? `${data.studentId}:${data.title}:${Date.now()}`)
      .digest('hex');
    const verifyCode = crypto.randomBytes(8).toString('hex');

    const cert = await CertificateModel.create({
      tenantId: new Types.ObjectId(tenantId),
      studentId: new Types.ObjectId(data.studentId),
      issuedBy: new Types.ObjectId(issuedBy),
      title: data.title, documentUrl: data.documentUrl, sha256, verifyCode,
    });
    // Anchor the hash on-chain (real when ANCHOR_* configured; dev pseudo-anchor otherwise).
    cert.chain = await anchor.anchorHash(sha256);
    await cert.save();
    return cert;
  },

  async verify(verifyCode: string) {
    const cert = await CertificateModel.findOne({ verifyCode })
      .populate('studentId', 'name')
      .populate('tenantId', 'name');
    if (!cert) throw new NotFoundError('Certificate not found');
    const student = cert.studentId as unknown as { name?: string } | null;
    const school = cert.tenantId as unknown as { name?: string } | null;
    return { valid: true, title: cert.title, studentName: student?.name, issuer: school?.name,
      sha256: cert.sha256, chain: cert.chain, verifyCode: cert.verifyCode, issuedAt: cert.get('createdAt') };
  },

  listForStudent(tenantId: string, studentId: string) {
    return CertificateModel.find({ tenantId, studentId });
  },
};
