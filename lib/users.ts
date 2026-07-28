import { r2Get, r2Put, r2Del } from './r2';
import { createHash, randomBytes } from 'crypto';
import bcrypt from 'bcrypt';

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

function isBcryptHash(hash: string): boolean {
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
  return a.length === b.length && require('crypto').timingSafeEqual(a, b);
}

async function readIndex(): Promise<{ email: string; userId: string }[]> {
  return (await r2Get<{ email: string; userId: string }[]>(INDEX_PATH)) ?? [];
}

async function writeIndex(index: { email: string; userId: string }[]): Promise<void> {
  await r2Put(INDEX_PATH, JSON.stringify(index));
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
  const existing = await getUserByEmail(email);
  if (existing) throw new Error('An account with this email already exists.');

  const userId = randomBytes(16).toString('hex');
  const user: User = {
    userId,
    email: email.toLowerCase().trim(),
    name: name.trim(),
    passwordHash: await hashPassword(password),
    role,
    createdAt: new Date().toISOString(),
  };

  await r2Put(`${PREFIX}${userId}.json`, JSON.stringify(user));

  const index = await readIndex();
  index.push({ email: user.email, userId });
  await writeIndex(index);

  return user;
}

export async function deleteUser(userId: string): Promise<void> {
  const user = await getUserById(userId);
  if (!user) return;

  await r2Del(`${PREFIX}${userId}.json`);

  const index = await readIndex();
  await writeIndex(index.filter(e => e.userId !== userId));
}

export async function updateUserRole(userId: string, role: 'admin' | 'user'): Promise<void> {
  const user = await getUserById(userId);
  if (!user) return;
  await r2Put(`${PREFIX}${userId}.json`, JSON.stringify({ ...user, role }));
}

export async function updatePassword(userId: string, newPassword: string): Promise<void> {
  const user = await getUserById(userId);
  if (!user) throw new Error('User not found.');
  await r2Put(`${PREFIX}${userId}.json`, JSON.stringify({ ...user, passwordHash: await hashPassword(newPassword) }));
}

export async function markGoogleAuth(userId: string): Promise<void> {
  const user = await getUserById(userId);
  if (!user || user.googleAuth) return;
  await r2Put(`${PREFIX}${userId}.json`, JSON.stringify({ ...user, googleAuth: true }));
}

export async function recordLogin(userId: string, upgradedHash?: string): Promise<void> {
  const user = await getUserById(userId);
  if (!user) return;
  const update: Partial<User> = { lastLoginAt: new Date().toISOString() };
  if (upgradedHash) update.passwordHash = upgradedHash;
  await r2Put(`${PREFIX}${userId}.json`, JSON.stringify({ ...user, ...update }));
}

export async function userCount(): Promise<number> {
  const index = await readIndex();
  return index.length;
}
