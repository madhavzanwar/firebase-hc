import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { collection, deleteDoc, doc, getDocs, getFirestore, setDoc } from 'firebase/firestore';
import { getFirebaseApp } from '../ai/firebase';
import type { SavedReport } from '../lib/types';

/**
 * Optional cloud backup. Only redacted, structured results are synced:
 * `redactedText` never leaves the device. Path: users/{uid}/reports/{id}
 * (see firestore.rules: owner-only access).
 */

export function watchUser(cb: (u: User | null) => void): () => void {
  const app = getFirebaseApp();
  if (!app) {
    cb(null);
    return () => {};
  }
  return onAuthStateChanged(getAuth(app), cb);
}

export async function signIn(): Promise<void> {
  const app = getFirebaseApp();
  if (!app) throw new Error('firebase_not_configured');
  await signInWithPopup(getAuth(app), new GoogleAuthProvider());
}

export async function signOutUser(): Promise<void> {
  const app = getFirebaseApp();
  if (app) await signOut(getAuth(app));
}

/** Strip anything that must stay on this device, and undefined values Firestore rejects. */
export function toCloud(r: SavedReport): Omit<SavedReport, 'redactedText'> {
  const rest: Partial<SavedReport> = { ...r };
  delete rest.redactedText;
  return JSON.parse(JSON.stringify(rest)) as Omit<SavedReport, 'redactedText'>;
}

export async function pushReport(uid: string, r: SavedReport): Promise<void> {
  const app = getFirebaseApp();
  if (!app) return;
  await setDoc(doc(getFirestore(app), 'users', uid, 'reports', r.id), toCloud(r));
}

export async function removeRemote(uid: string, id: string): Promise<void> {
  const app = getFirebaseApp();
  if (!app) return;
  await deleteDoc(doc(getFirestore(app), 'users', uid, 'reports', id));
}

export async function pullReports(uid: string): Promise<SavedReport[]> {
  const app = getFirebaseApp();
  if (!app) return [];
  const snap = await getDocs(collection(getFirestore(app), 'users', uid, 'reports'));
  return snap.docs.map((d) => d.data() as SavedReport);
}

/** Two-way merge by updatedAt. Returns the merged list of remote reports to save locally. */
export async function syncAll(uid: string, local: SavedReport[]): Promise<SavedReport[]> {
  const remote = await pullReports(uid);
  const byId = new Map(remote.map((r) => [r.id, r]));
  const toLocal: SavedReport[] = [];
  for (const l of local) {
    const r = byId.get(l.id);
    if (!r || r.updatedAt < l.updatedAt) await pushReport(uid, l);
    else if (r.updatedAt > l.updatedAt) toLocal.push({ ...r, ...(l.redactedText ? { redactedText: l.redactedText } : {}) });
    byId.delete(l.id);
  }
  toLocal.push(...byId.values());
  return toLocal;
}
