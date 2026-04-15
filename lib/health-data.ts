import { r2Get, r2Put } from './r2';

const PREFIX = 'health-data';

async function readBlob<T>(path: string): Promise<T | null> {
  return r2Get<T>(path);
}

async function writeBlob(path: string, data: unknown): Promise<void> {
  await r2Put(path, JSON.stringify(data));
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

// --- Notes (freeform, not tied to a visit or event) ---
export interface HealthNote {
  id: string;
  date: string;         // YYYY-MM-DD
  text: string;
  source: 'manual' | 'ai-chat';
  createdAt: string;
}

export async function getNotes(userId: string, personId?: string): Promise<HealthNote[]> {
  return (await readBlob<HealthNote[]>(`${personPrefix(userId, personId)}/notes.json`)) ?? [];
}

export async function saveNotes(userId: string, notes: HealthNote[], personId?: string): Promise<void> {
  await writeBlob(`${personPrefix(userId, personId)}/notes.json`, notes);
}

// --- Upload manifest (metadata about uploaded files) ---
export async function getUploadManifest(userId: string, personId?: string): Promise<unknown[]> {
  return (await readBlob<unknown[]>(`${personPrefix(userId, personId)}/uploads-manifest.json`)) ?? [];
}

export async function saveUploadManifest(userId: string, files: unknown[], personId?: string): Promise<void> {
  await writeBlob(`${personPrefix(userId, personId)}/uploads-manifest.json`, files);
}
