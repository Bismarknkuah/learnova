import crypto from 'node:crypto';
import { config } from '../config/index.js';

/** Derive a stable 32-byte key from a server secret (set ENCRYPTION_KEY in prod; falls back to JWT secret). */
function key(): Buffer {
  const secret = process.env.ENCRYPTION_KEY || config.jwt.accessSecret || 'learnova-dev-secret';
  return crypto.createHash('sha256').update(secret).digest();
}

const PREFIX = 'enc:v1:';

/** Encrypt a string → "enc:v1:<iv>:<tag>:<ciphertext>" (all base64). Safe to store. */
export function encryptSecret(plain: string): string {
  if (!plain) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + [iv.toString('base64'), tag.toString('base64'), ct.toString('base64')].join(':');
}

/** Decrypt a value produced by encryptSecret. Plain (legacy/unencrypted) values are returned as-is. */
export function decryptSecret(stored: string): string {
  if (!stored || !stored.startsWith(PREFIX)) return stored ?? '';
  try {
    const [, , ivB, tagB, ctB] = stored.split(':');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(ivB, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(ctB, 'base64')), decipher.final()]).toString('utf8');
  } catch { return ''; }
}

export function isEncrypted(v?: string): boolean { return !!v && v.startsWith(PREFIX); }
