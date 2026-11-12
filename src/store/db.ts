import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { PrivacyLogEntry, SavedReport } from '../lib/types';

interface LabLensDB extends DBSchema {
  reports: { key: string; value: SavedReport; indexes: { byDate: string } };
  privacyLog: { key: string; value: PrivacyLogEntry; indexes: { byAt: number } };
}

let dbp: Promise<IDBPDatabase<LabLensDB>> | undefined;

function db() {
  dbp ??= openDB<LabLensDB>('lablens', 1, {
    upgrade(d) {
      const r = d.createObjectStore('reports', { keyPath: 'id' });
      r.createIndex('byDate', 'date');
      const l = d.createObjectStore('privacyLog', { keyPath: 'id' });
      l.createIndex('byAt', 'at');
    },
  });
  return dbp;
}

export async function saveReport(r: SavedReport): Promise<void> {
  await (await db()).put('reports', r);
}

export async function listReports(): Promise<SavedReport[]> {
  const all = await (await db()).getAll('reports');
  return all.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
}

export async function getReport(id: string): Promise<SavedReport | undefined> {
  return (await db()).get('reports', id);
}

export async function deleteReport(id: string): Promise<void> {
  await (await db()).delete('reports', id);
}

export async function addLog(e: PrivacyLogEntry): Promise<void> {
  await (await db()).put('privacyLog', e);
}

export async function listLog(): Promise<PrivacyLogEntry[]> {
  const all = await (await db()).getAll('privacyLog');
  return all.sort((a, b) => b.at - a.at);
}

export async function clearLog(): Promise<void> {
  await (await db()).clear('privacyLog');
}

export async function clearAll(): Promise<void> {
  const d = await db();
  await Promise.all([d.clear('reports'), d.clear('privacyLog')]);
}
