import { put, list } from '@vercel/blob';

const PREFIX = 'health-data';

async function readBlob<T>(path: string): Promise<T | null> {
  try {
    const { blobs } = await list({ prefix: path });
    if (blobs.length === 0) return null;
    const res = await fetch(blobs[0].url, {
      headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
    });
    if (!res.ok) return null;
    return await res.json() as T;
  } catch {
    return null;
  }
}

async function writeBlob(path: string, data: unknown): Promise<void> {
  await put(path, JSON.stringify(data), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
  });
}

// personId = 'primary' → legacy paths (backward compat)
// personId = any other id → person/{personId}/ prefix
function personPrefix(userId: string, personId?: string): string {
  if (!personId || personId === 'primary') return `${PREFIX}/${userId}`;
  return `${PREFIX}/${userId}/person/${personId}`;
}

// --- Persons list (who is being tracked) ---
export interface TrackedPerson {
  id: string;
  name: string;
  ageGroup: string;
}

export async function getPersons(userId: string): Promise<TrackedPerson[]> {
  return (await readBlob<TrackedPerson[]>(`${PREFIX}/${userId}/persons.json`)) ?? [];
}

export async function savePersons(userId: string, persons: TrackedPerson[]): Promise<void> {
  await writeBlob(`${PREFIX}/${userId}/persons.json`, persons);
}

// --- Account holder info ---
export interface AccountInfo {
  firstName: string;
}

export async function getAccountInfo(userId: string): Promise<AccountInfo | null> {
  return readBlob<AccountInfo>(`${PREFIX}/${userId}/account.json`);
}

export async function saveAccountInfo(userId: string, info: AccountInfo): Promise<void> {
  await writeBlob(`${PREFIX}/${userId}/account.json`, info);
}

// --- Events ---
export async function getEvents(userId: string, personId?: string): Promise<unknown[]> {
  return (await readBlob<unknown[]>(`${personPrefix(userId, personId)}/events.json`)) ?? [];
}

export async function saveEvents(userId: string, events: unknown[], personId?: string): Promise<void> {
  await writeBlob(`${personPrefix(userId, personId)}/events.json`, events);
}

// --- Patient info ---
export async function getPatientInfo(userId: string, personId?: string): Promise<unknown | null> {
  return readBlob(`${personPrefix(userId, personId)}/patient.json`);
}

export async function savePatientInfo(userId: string, info: unknown, personId?: string): Promise<void> {
  await writeBlob(`${personPrefix(userId, personId)}/patient.json`, info);
}

// --- Doctor visits ---
export async function getDoctorVisits(userId: string, personId?: string): Promise<unknown[]> {
  return (await readBlob<unknown[]>(`${personPrefix(userId, personId)}/visits.json`)) ?? [];
}

export async function saveDoctorVisits(userId: string, visits: unknown[], personId?: string): Promise<void> {
  await writeBlob(`${personPrefix(userId, personId)}/visits.json`, visits);
}

// --- Upload manifest (metadata about uploaded files) ---
export async function getUploadManifest(userId: string, personId?: string): Promise<unknown[]> {
  return (await readBlob<unknown[]>(`${personPrefix(userId, personId)}/uploads-manifest.json`)) ?? [];
}

export async function saveUploadManifest(userId: string, files: unknown[], personId?: string): Promise<void> {
  await writeBlob(`${personPrefix(userId, personId)}/uploads-manifest.json`, files);
}
