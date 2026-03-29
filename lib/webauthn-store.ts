import { put, list, del } from '@vercel/blob';

export interface StoredCredential {
  id: string;
  publicKey: string; // base64
  counter: number;
}

// Credential data is encoded in the blob pathname — no content reads needed.
// list() works reliably; reading private blob contents does not.
const PREFIX = 'webauthn/c/';

function encodeToPath(cred: StoredCredential): string {
  const json = JSON.stringify(cred);
  // base64url (no +/= chars that break URL paths)
  return Buffer.from(json).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function decodeFromPath(encoded: string): StoredCredential | null {
  try {
    const b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

export async function getCredentials(): Promise<StoredCredential[]> {
  try {
    const { blobs } = await list({ prefix: PREFIX });
    return blobs
      .map(b => decodeFromPath(b.pathname.slice(PREFIX.length)))
      .filter((c): c is StoredCredential => c !== null);
  } catch {
    return [];
  }
}

export async function saveCredentials(creds: StoredCredential[]): Promise<void> {
  // Delete all existing credential blobs
  const { blobs } = await list({ prefix: PREFIX });
  if (blobs.length > 0) {
    await del(blobs.map(b => b.url));
  }
  // Store each credential encoded in the pathname; content is just a placeholder
  for (const cred of creds) {
    await put(`${PREFIX}${encodeToPath(cred)}`, '{}', {
      access: 'private',
      addRandomSuffix: false,
    });
  }
}
