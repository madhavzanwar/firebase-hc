import { initializeApp, type FirebaseApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider, type AppCheck } from 'firebase/app-check';
import { getAI, GoogleAIBackend, type AI } from 'firebase/ai';

/**
 * Firebase initialisation. The web config comes from Vite env variables
 * (see .env.example). Without a config the app still works: everything
 * deterministic runs, and AI runs only if Gemini Nano is present.
 */

const env = import.meta.env;

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: env.VITE_FIREBASE_APP_ID as string | undefined,
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);

let app: FirebaseApp | undefined;
let appCheck: AppCheck | undefined;
let ai: AI | undefined;

declare global {
  var FIREBASE_APPCHECK_DEBUG_TOKEN: boolean | string | undefined;
}

export function getFirebaseApp(): FirebaseApp | undefined {
  if (!isFirebaseConfigured) return undefined;
  if (app) return app;
  app = initializeApp(firebaseConfig);

  // App Check is required by Firebase AI Logic (enforced from 2 Nov 2026).
  const siteKey = env.VITE_RECAPTCHA_ENTERPRISE_KEY as string | undefined;
  if (env.VITE_APPCHECK_DEBUG === 'true' && env.DEV) {
    // Local development only: the SDK prints a debug token to register in the console.
    globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }
  if (siteKey) {
    appCheck = initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(siteKey), isTokenAutoRefreshEnabled: true });
  } else if (!env.VITE_E2E) {
    console.warn('[LabLens] VITE_RECAPTCHA_ENTERPRISE_KEY is not set: cloud AI calls will be rejected while App Check is enforced.');
  }
  return app;
}

export function getAppCheckInstance(): AppCheck | undefined {
  getFirebaseApp();
  return appCheck;
}

/** The Firebase AI Logic service (Gemini Developer API backend). */
export function getAIService(): AI | undefined {
  if (ai) return ai;
  const a = getFirebaseApp();
  if (!a) return undefined;
  ai = getAI(a, { backend: new GoogleAIBackend() });
  return ai;
}
