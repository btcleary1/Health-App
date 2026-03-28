import { put, list, getDownloadUrl } from '@vercel/blob';

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
    const signedUrl = await getDownloadUrl(blob.url);
    const res = await fetch(signedUrl, { cache: 'no-store' });
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
