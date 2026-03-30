import { put, list } from '@vercel/blob';

const PREFIX = 'health-data';

async function readBlob<T>(path: string): Promise<T | null> {
  try {
    const { blobs } = await list({ prefix: path });
    if (blobs.length === 0) return null;
    const res = await fetch(blobs[0].url);
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

// --- Events ---
export async function getEvents(userId: string): Promise<unknown[]> {
  return (await readBlob<unknown[]>(`${PREFIX}/${userId}/events.json`)) ?? [];
}

export async function saveEvents(userId: string, events: unknown[]): Promise<void> {
  await writeBlob(`${PREFIX}/${userId}/events.json`, events);
}

// --- Patient info ---
export async function getPatientInfo(userId: string): Promise<unknown | null> {
  return readBlob(`${PREFIX}/${userId}/patient.json`);
}

export async function savePatientInfo(userId: string, info: unknown): Promise<void> {
  await writeBlob(`${PREFIX}/${userId}/patient.json`, info);
}

// --- Doctor visits ---
export async function getDoctorVisits(userId: string): Promise<unknown[]> {
  return (await readBlob<unknown[]>(`${PREFIX}/${userId}/visits.json`)) ?? [];
}

export async function saveDoctorVisits(userId: string, visits: unknown[]): Promise<void> {
  await writeBlob(`${PREFIX}/${userId}/visits.json`, visits);
}
