import { r2Get, r2Put } from './r2';
import bcrypt from 'bcrypt';

const BLOB_PATH = 'health-app/passphrase.json';
const BCRYPT_ROUNDS = 12;

export async function hashPassphrase(passphrase: string): Promise<string> {
  return bcrypt.hash(passphrase, BCRYPT_ROUNDS);
}

export async function verifyPassphrase(passphrase: string, storedHash: string): Promise<boolean> {
  return bcrypt.compare(passphrase, storedHash);
}

export async function getStoredHash(): Promise<string | null> {
  const data = await r2Get<{ hash: string }>(BLOB_PATH);
  if (data?.hash) return data.hash;
  return null;
}

export async function savePassphraseHash(hash: string): Promise<void> {
  await r2Put(BLOB_PATH, JSON.stringify({ hash }));
}
