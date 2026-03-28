import { put, list } from '@vercel/blob';

export interface StoredCredential {
  id: string;
  publicKey: string; // base64
  counter: number;
}

const CREDS_PATH = 'webauthn/credentials.json';

export async function getCredentials(): Promise<StoredCredential[]> {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN ?? '';
    const { blobs } = await list({ prefix: 'webauthn/' });
    const blob = blobs.find(b => b.pathname === CREDS_PATH);
    if (!blob) return [];
    const res = await fetch(blob.url, {
      headers: { authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function saveCredentials(creds: StoredCredential[]): Promise<void> {
  await put(CREDS_PATH, JSON.stringify(creds), {
    access: 'private',
    addRandomSuffix: false,
  });
}
