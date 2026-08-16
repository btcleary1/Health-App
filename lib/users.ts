import { r2Get, r2Put, r2Del } from './r2';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import bcrypt from 'bcryptjs';

const PREFIX = 'health-app/users/';
const INDEX_PATH = 'health-app/users-index.json';
const BCRYPT_ROUNDS = 12;

export interface User {
  userId: string;
  email: string;
  name: string;
  passwordHash: string;
  role: 'admin' | 'user';
  createdAt: string;
  lastLoginAt?: string;
  googleAuth?: boolean;
}

export type PublicUser = Omit<User, 'passwordHash'>;

function legacySha256Hash(password: string): string {
  const salt = process.env.SESSION_SECRET ?? 'health-app-salt';
  return createHash('sha256').update(salt + password).digest('hex');
}

export function isBcryptHash(hash: string): boolean {
  return hash.startsWith('$2b$') || hash.startsWith('$2a$');
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (isBcryptHash(storedHash)) {
    return bcrypt.compare(password, storedHash);
  }
  // Legacy SHA-256 — constant-time compare
  const legacy = legacySha256Hash(password);
  const a = Buffer.from(legacy, 'hex');
  const b = Buffer.from(storedHash.padEnd(a.length, '0').slice(0, a.length), 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

async function readIndex(): Promise<{ email: string; userId: string }[]> {
  return (await r2Get<{ email: string; userId: string }[]>(INDEX_PATH)) ?? [];
}

async function writeIndex(index: { email: string; userId: string }[]): Promise<void> {
  await r2Put(INDEX_PATH, JSON.stringify(index));
}

async function patchUser(userId: string, patch: Partial<User>): Promise<void> {
  const user = await getUserById(userId);
  if (!user) return;
  await r2Put(`${PREFIX}${userId}.json`, JSON.stringify({ ...user, ...patch }));
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const index = await readIndex();
  const entry = index.find(e => e.email.toLowerCase() === email.toLowerCase());
  if (!entry) return null;
  return getUserById(entry.userId);
}

export async function getUserById(userId: string): Promise<User | null> {
  return r2Get<User>(`${PREFIX}${userId}.json`);
}

export async function getAllUsers(): Promise<PublicUser[]> {
  try {
    const index = await readIndex();
    const users = await Promise.all(index.map(e => getUserById(e.userId)));
    return users
      .filter((u): u is User => u !== null)
      .map(({ passwordHash: _ph, ...pub }) => pub);
  } catch {
    return [];
  }
}

export async function createUser(
  email: string,
  name: string,
  password: string,
  role: 'admin' | 'user' = 'user'
): Promise<User> {
  const [index, passwordHash] = await Promise.all([readIndex(), hashPassword(password)]);
  if (index.some(e => e.email.toLowerCase() === email.toLowerCase())) {
    throw new Error('An account with this email already exists.');
  }

  const userId = randomBytes(16).toString('hex');
  const user: User = {
    userId,
    email: email.toLowerCase().trim(),
    name: name.trim(),
    passwordHash,
    role,
    createdAt: new Date().toISOString(),
  };

  await r2Put(`${PREFIX}${userId}.json`, JSON.stringify(user));
  await writeIndex([...index, { email: user.email, userId }]);

  return user;
}

export async function deleteUser(userId: string): Promise<void> {
  const [user, index] = await Promise.all([getUserById(userId), readIndex()]);
  if (!user) return;
  await Promise.all([
    r2Del(`${PREFIX}${userId}.json`),
    writeIndex(index.filter(e => e.userId !== userId)),
  ]);
}

export async function updateUserRole(userId: string, role: 'admin' | 'user'): Promise<void> {
  await patchUser(userId, { role });
}

export async function updatePassword(userId: string, newPassword: string): Promise<void> {
  const [user, passwordHash] = await Promise.all([getUserById(userId), hashPassword(newPassword)]);
  if (!user) throw new Error('User not found.');
  await r2Put(`${PREFIX}${userId}.json`, JSON.stringify({ ...user, passwordHash }));
}

export async function markGoogleAuth(userId: string): Promise<void> {
  const user = await getUserById(userId);
  if (!user || user.googleAuth) return;
  await r2Put(`${PREFIX}${userId}.json`, JSON.stringify({ ...user, googleAuth: true }));
}

export async function recordLogin(userId: string, upgradedHash?: string): Promise<void> {
  const patch: Partial<User> = { lastLoginAt: new Date().toISOString() };
  if (upgradedHash) patch.passwordHash = upgradedHash;
  await patchUser(userId, patch);
}

export async function userCount(): Promise<number> {
  const index = await readIndex();
  return index.length;
}
