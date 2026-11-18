// Entries the Health chat creates, and removing them (the chat's Undo button and "delete that").
import { getEvents, saveEvents, getDoctorVisits, saveDoctorVisits, getNotes, saveNotes } from './health-data';

export type Kind = 'event' | 'visit' | 'note';
export type LoggedItem = { kind: Kind; id: string; date: string; title: string; detail: string };

// Deletes this account's own entries by kind and id (used by the chat and its Undo button).
export async function removeEntries(userId: string, personId: string, items: { kind: Kind; id: string }[]): Promise<LoggedItem[]> {
  const removed: LoggedItem[] = [];
  const want = (k: Kind) => new Set(items.filter((i) => i.kind === k).map((i) => i.id));
  const ev = want('event');
  if (ev.size) {
    const all = (await getEvents(userId, personId)) as any[];
    const gone = all.filter((e) => ev.has(String(e?.id)));
    if (gone.length) {
      await saveEvents(userId, all.filter((e) => !ev.has(String(e?.id))), personId);
      removed.push(...gone.map((e) => ({ kind: 'event' as const, id: String(e.id), date: e.date, title: `${String(e.type).replace('_', ' ')} · ${e.severity}`, detail: '' })));
    }
  }
  const vi = want('visit');
  if (vi.size) {
    const all = (await getDoctorVisits(userId, personId)) as any[];
    const gone = all.filter((v) => vi.has(String(v?.id)));
    if (gone.length) {
      await saveDoctorVisits(userId, all.filter((v) => !vi.has(String(v?.id))), personId);
      removed.push(...gone.map((v) => ({ kind: 'visit' as const, id: String(v.id), date: v.date, title: `${String(v.visitType).replace('_', ' ')} visit`, detail: '' })));
    }
  }
  const no = want('note');
  if (no.size) {
    const all = await getNotes(userId, personId);
    const gone = all.filter((n) => no.has(n.id));
    if (gone.length) {
      await saveNotes(userId, all.filter((n) => !no.has(n.id)), personId);
      removed.push(...gone.map((n) => ({ kind: 'note' as const, id: n.id, date: n.date, title: 'Note', detail: '' })));
    }
  }
  return removed;
}

