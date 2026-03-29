import { put, get } from '@vercel/blob';

export interface StoredCredential {
  id: string;
  publicKey: string; // base64
  counter: number;
}

const CREDS_PATH = 'webauthn/credentials.json';

export async function getCredentials(): Promise<StoredCredential[]> {
  try {
    const blobResult = await get(CREDS_PATH);
    if (!blobResult) return [];
    const res = await fetch(blobResult.downloadUrl, { cache: 'no-store' });
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
