import { put, get, list } from '@vercel/blob';

export interface StoredCredential {
  id: string;
  publicKey: string; // base64
  counter: number;
}

const CREDS_PATH = 'webauthn/credentials.json';

export async function getCredentials(): Promise<StoredCredential[]> {
  try {
    const { blobs } = await list({ prefix: 'webauthn/' });
    const blob = blobs.find(b => b.pathname === CREDS_PATH);
    if (!blob) return [];
    const res = await get(blob.url);
    if (!res) return [];
    const text = await res.text();
    return JSON.parse(text);
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
