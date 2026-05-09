import { scrypt as scryptCb, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb);
const N = 16384;
const KEYLEN = 64;
const SALT_BYTES = 16;

export async function hashPassword(plain) {
  if (typeof plain !== 'string' || plain.length < 4) {
    throw new Error('비밀번호는 4자 이상이어야 해요');
  }
  const salt = randomBytes(SALT_BYTES);
  const derived = await scrypt(plain, salt, KEYLEN, { N });
  return `scrypt$${N}$${salt.toString('base64')}$${derived.toString('base64')}`;
}

export async function verifyPassword(plain, stored) {
  if (!stored || typeof stored !== 'string') return false;
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'scrypt') return false;
  const n = parseInt(parts[1], 10);
  if (!Number.isFinite(n) || n <= 0) return false;
  const salt = Buffer.from(parts[2], 'base64');
  const expected = Buffer.from(parts[3], 'base64');
  const derived = await scrypt(plain, salt, expected.length, { N: n });
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}
