import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import {
  type FirebaseClientConfig,
  hasFirebaseEnv,
  isValidFirebaseConfig,
  readFirebaseEnv,
} from "./firebase-config";

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let initFailed = false;
let initPromise: Promise<boolean> | null = null;
let activeConfig: FirebaseClientConfig | null = null;

async function fetchRuntimeConfig(): Promise<FirebaseClientConfig> {
  const res = await fetch("/api/firebase-config", { cache: "no-store" });
  if (!res.ok) throw new Error(`firebase-config HTTP ${res.status}`);
  return (await res.json()) as FirebaseClientConfig;
}

function initWithConfig(config: FirebaseClientConfig): boolean {
  if (!isValidFirebaseConfig(config)) return false;
  activeConfig = config;
  app = getApps().length ? getApps()[0]! : initializeApp(config);
  db = getFirestore(app);
  storage = getStorage(app);
  return true;
}

/** Load config from build-time env or /api/firebase-config (Vercel). */
export async function ensureFirebaseInitialized(): Promise<boolean> {
  if (app) return true;
  if (initFailed) return false;
  if (!initPromise) {
    initPromise = (async () => {
      try {
        if (hasFirebaseEnv()) {
          return initWithConfig(readFirebaseEnv());
        }
        const remote = await fetchRuntimeConfig();
        return initWithConfig(remote);
      } catch (error) {
        console.error("Firebase initialization failed:", error);
        initFailed = true;
        return false;
      }
    })();
  }
  return initPromise;
}

export function getFirebaseApp(): FirebaseApp | null {
  return app;
}

export function getFirebaseDb(): Firestore | null {
  return db;
}

export function getFirebaseStorage(): FirebaseStorage | null {
  return storage;
}

export function isFirebaseConfigured(): boolean {
  if (app) return true;
  if (hasFirebaseEnv() && !initFailed) return true;
  return isValidFirebaseConfig(activeConfig);
}
