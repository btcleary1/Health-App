import { put, head, del } from '@vercel/blob';

export interface StoredCredential {
  id: string;
  publicKey: string; // base64
  counter: number;
  userId: string;
  transports?: string[]; // e.g. ['internal'] for platform (Face ID / Touch ID)
}

// Credentials stored as a JSON array at a deterministic path per user.
// No list() needed — head() is a basic (non-advanced) operation.
function credPath(userId: string): string {
  return `webauthn/${userId}/credentials.json`;
}

// Reverse index: maps credentialId → userId so we can look up during auth
// without scanning all users.
const CRED_INDEX_PATH = 'webauthn/cred-index.json';

function blobFetch(url: string) {
  return fetch(url, {
    headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
    cache: 'no-store',
  });
}

async function readCredIndex(): Promise<Record<string, string>> {
  try {
    const blob = await head(CRED_INDEX_PATH);
    if (!blob) return {};
    const res = await blobFetch(blob.downloadUrl);
    if (!res.ok) return {};
    return await res.json();
  } catch {
    return {};
  }
}

async function writeCredIndex(index: Record<string, string>): Promise<void> {
  await put(CRED_INDEX_PATH, JSON.stringify(index), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
  });
}

export async function getCredentialsForUser(userId: string): Promise<StoredCredential[]> {
  try {
    const blob = await head(credPath(userId));
    if (!blob) return [];
    const res = await blobFetch(blob.downloadUrl);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

/** Find which user owns a given credential ID (needed for WebAuthn login before session exists) */
export async function findCredentialById(credId: string): Promise<StoredCredential | null> {
  try {
    const index = await readCredIndex();
    const userId = index[credId];
    if (!userId) return null;
    const creds = await getCredentialsForUser(userId);
    return creds.find(c => c.id === credId) ?? null;
  } catch {
    return null;
  }
}

export async function saveCredentialsForUser(userId: string, creds: StoredCredential[]): Promise<void> {
  await put(credPath(userId), JSON.stringify(creds), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
  });

  // Update the reverse index
  const index = await readCredIndex();
  // Remove old entries for this user
  for (const key of Object.keys(index)) {
    if (index[key] === userId) delete index[key];
  }
  // Add new entries
  for (const cred of creds) {
    index[cred.id] = userId;
  }
  await writeCredIndex(index);
}

/** Delete all credentials for a user (called when account is deleted or biometrics disabled) */
export async function deleteCredentialsForUser(userId: string): Promise<void> {
  const blob = await head(credPath(userId));
  if (blob) await del(blob.url);

  const index = await readCredIndex();
  for (const key of Object.keys(index)) {
    if (index[key] === userId) delete index[key];
  }
  await writeCredIndex(index);
}

/** Update counter for a specific credential */
export async function updateCredentialCounter(credId: string, newCounter: number): Promise<void> {
  const cred = await findCredentialById(credId);
  if (!cred) return;
  const userId = cred.userId;
  const all = await getCredentialsForUser(userId);
  const updated = all.map(c => c.id === credId ? { ...c, counter: newCounter } : c);
  await saveCredentialsForUser(userId, updated);
}
