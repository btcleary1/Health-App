import { r2Get, r2GetStrict, r2Put, r2Del } from './r2';

interface StoredCredential {
  id: string;
  publicKey: string; // base64
  counter: number;
  userId: string;
  transports?: string[]; // e.g. ['internal'] for platform (Face ID / Touch ID)
}

function credPath(userId: string): string {
  return `webauthn/${userId}/credentials.json`;
}

const CRED_INDEX_PATH = 'webauthn/cred-index.json';

// Throws on storage errors (only a missing file reads as empty), so a passing error can
// never be written back as an empty index and wipe everyone's passkey lookups.
async function readCredIndex(): Promise<Record<string, string>> {
  return (await r2GetStrict<Record<string, string>>(CRED_INDEX_PATH)) ?? {};
}

// User ids are hex today; this also keeps anything odd out of the storage path.
const SAFE_USER_ID = /^[A-Za-z0-9_-]{1,128}$/;

// The passkey's user handle is the user id we set at registration (UTF-8, base64url-encoded).
function userIdFromHandle(userHandle: unknown): string | null {
  if (typeof userHandle !== 'string' || !userHandle) return null;
  try {
    const id = Buffer.from(userHandle, 'base64url').toString('utf8');
    return SAFE_USER_ID.test(id) ? id : null;
  } catch {
    return null;
  }
}

async function writeCredIndex(index: Record<string, string>): Promise<void> {
  await r2Put(CRED_INDEX_PATH, JSON.stringify(index));
}

export async function getCredentialsForUser(userId: string): Promise<StoredCredential[]> {
  return (await r2Get<StoredCredential[]>(credPath(userId))) ?? [];
}

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

// Finds the stored passkey for a login. Looks in the shared index first; if the index has
// lost the entry, falls back to the user named by the passkey's user handle and repairs
// the index. Returns null only when the server truly has no record of this passkey.
export async function findCredentialForLogin(
  credId: string,
  userHandle?: unknown,
): Promise<StoredCredential | null> {
  if (typeof credId !== 'string' || !credId) return null;

  const fromIndex = await findCredentialById(credId);
  if (fromIndex) return fromIndex;

  const userId = userIdFromHandle(userHandle);
  if (!userId) return null;
  const creds = await getCredentialsForUser(userId);
  const match = creds.find(c => c.id === credId);
  if (!match) return null;

  try {
    const index = await readCredIndex();
    index[credId] = userId;
    await writeCredIndex(index);
  } catch {
    // The login still works; the index is repaired on the next save.
  }
  return { ...match, userId };
}

export async function saveCredentialsForUser(userId: string, creds: StoredCredential[]): Promise<void> {
  await r2Put(credPath(userId), JSON.stringify(creds));

  const index = await readCredIndex();
  for (const key of Object.keys(index)) {
    if (index[key] === userId) delete index[key];
  }
  for (const cred of creds) {
    index[cred.id] = userId;
  }
  await writeCredIndex(index);
}

export async function deleteCredentialsForUser(userId: string): Promise<void> {
  await r2Del(credPath(userId));

  const index = await readCredIndex();
  for (const key of Object.keys(index)) {
    if (index[key] === userId) delete index[key];
  }
  await writeCredIndex(index);
}

export async function updateCredentialCounter(credId: string, newCounter: number, userId?: string): Promise<void> {
  const ownerId = userId ?? (await findCredentialById(credId))?.userId;
  if (!ownerId) return;
  const all = await getCredentialsForUser(ownerId);
  const updated = all.map(c => c.id === credId ? { ...c, counter: newCounter } : c);
  await saveCredentialsForUser(ownerId, updated);
}
