import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { User } from 'firebase/auth';
import { LANG_LABELS, type Lang } from '../lib/i18n-types';
import type { Capabilities, NanoStatus, Prefs } from '../lib/routing';
import type { PrivacyLogEntry, SavedReport } from '../lib/types';
import { probeNano } from '../ai/capabilities';
import { initDeviceModel, onPrivacyEvent } from '../ai/engine';
import { isFirebaseConfigured } from '../ai/firebase';
import { aiConfig, loadRemoteConfig } from '../ai/remote-config';
import * as db from '../store/db';
const sync = () => import('../store/sync');
import type { Ctx } from './pipeline';

function readPrefs(): Prefs {
  try {
    const raw = localStorage.getItem('lablens.prefs');
    if (raw) return { onDeviceOnly: false, allowCloudForRedacted: true, ...(JSON.parse(raw) as Partial<Prefs>) };
  } catch {
    /* ignore */
  }
  return { onDeviceOnly: false, allowCloudForRedacted: true };
}

interface AppState {
  lang: Lang;
  setLang: (l: Lang) => void;
  prefs: Prefs;
  setPrefs: (p: Partial<Prefs>) => void;
  caps: Capabilities;
  downloadPct: number | null;
  enableNano: () => Promise<void>;
  refreshCaps: () => Promise<void>;
  reports: SavedReport[];
  upsertReport: (r: SavedReport) => Promise<void>;
  removeReport: (id: string) => Promise<void>;
  log: PrivacyLogEntry[];
  clearLog: () => Promise<void>;
  wipe: () => Promise<void>;
  user: User | null;
  syncNow: () => Promise<number>;
  ctx: (extra?: Partial<Ctx>) => Ctx;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const [lang, setLangState] = useState<Lang>((i18n.language as Lang) ?? 'en');
  const [prefs, setPrefsState] = useState<Prefs>(readPrefs);
  const [nano, setNano] = useState<{ status: NanoStatus; langs: Lang[]; image: boolean }>({ status: 'no_api', langs: [], image: false });
  const [online, setOnline] = useState(navigator.onLine);
  const [downloadPct, setDownloadPct] = useState<number | null>(null);
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [log, setLog] = useState<PrivacyLogEntry[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const userRef = useRef<User | null>(null);

  const caps: Capabilities = useMemo(
    () => ({
      // All inference goes through Firebase AI Logic, so Nano needs the Firebase SDK configured too.
      nano: isFirebaseConfigured ? nano.status : 'no_api',
      nanoLangs: isFirebaseConfigured ? nano.langs : [],
      nanoImage: nano.image,
      online,
      cloudConfigured: isFirebaseConfigured,
    }),
    [nano, online],
  );

  const refreshCaps = useCallback(async () => setNano(await probeNano(aiConfig().nanoExtraLangs)), []);

  useEffect(() => {
    void probeNano().then(setNano);
    void loadRemoteConfig().then((cfg) => {
      if (cfg.nanoExtraLangs.length) void probeNano(cfg.nanoExtraLangs).then(setNano);
    });
    void db.listReports().then(setReports).catch(() => setReports([]));
    void db.listLog().then(setLog).catch(() => setLog([]));
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    const unsub = onPrivacyEvent((e) => {
      setLog((l) => [e, ...l]);
      void db.addLog(e).catch(() => {});
    });
    let unUser = () => {};
    if (isFirebaseConfigured)
      void sync().then((m) => {
        unUser = m.watchUser((u) => {
          userRef.current = u;
          setUser(u);
        });
      });
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
      unsub();
      unUser();
    };
  }, [refreshCaps]);

  useEffect(() => {
    document.documentElement.lang = LANG_LABELS[lang].bcp47;
  }, [lang]);

  const setLang = useCallback(
    (l: Lang) => {
      setLangState(l);
      void i18n.changeLanguage(l);
      try {
        localStorage.setItem('lablens.lang', l);
      } catch {
        /* ignore */
      }
    },
    [i18n],
  );

  const setPrefs = useCallback((p: Partial<Prefs>) => {
    setPrefsState((cur) => {
      const next = { ...cur, ...p };
      try {
        localStorage.setItem('lablens.prefs', JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const enableNano = useCallback(async () => {
    setDownloadPct(0);
    try {
      await initDeviceModel((p) => setDownloadPct(Math.round(p * 100)));
    } finally {
      setDownloadPct(null);
      await refreshCaps();
    }
  }, [refreshCaps]);

  const upsertReport = useCallback(async (r: SavedReport) => {
    setReports((rs) => [r, ...rs.filter((x) => x.id !== r.id)].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt));
    await db.saveReport(r);
    const u = userRef.current;
    if (u) void sync().then((m) => m.pushReport(u.uid, r)).catch((e) => console.info('[LabLens] sync failed', e));
  }, []);

  const removeReport = useCallback(async (id: string) => {
    setReports((rs) => rs.filter((x) => x.id !== id));
    await db.deleteReport(id);
    const u = userRef.current;
    if (u) void sync().then((m) => m.removeRemote(u.uid, id)).catch(() => {});
  }, []);

  const clearLog = useCallback(async () => {
    setLog([]);
    await db.clearLog();
  }, []);

  const wipe = useCallback(async () => {
    setLog([]);
    setReports([]);
    await db.clearAll();
  }, []);

  const syncNow = useCallback(async () => {
    const u = userRef.current;
    if (!u) return 0;
    const local = await db.listReports();
    const incoming = await (await sync()).syncAll(u.uid, local);
    for (const r of incoming) await db.saveReport(r);
    setReports(await db.listReports());
    return local.length + incoming.length;
  }, []);

  const ctx = useCallback((extra: Partial<Ctx> = {}): Ctx => ({ caps, prefs, lang, ...extra }), [caps, prefs, lang]);

  const value: AppState = {
    lang, setLang, prefs, setPrefs, caps, downloadPct, enableNano, refreshCaps, reports, upsertReport, removeReport,
    log, clearLog, wipe, user, syncNow, ctx,
  };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const v = useContext(AppContext);
  if (!v) throw new Error('useApp outside AppProvider');
  return v;
}
