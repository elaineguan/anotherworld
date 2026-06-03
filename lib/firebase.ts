import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { hasFirebaseEnv, readFirebaseEnv } from "./firebase-config";

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let initFailed = false;

export function getFirebaseApp(): FirebaseApp | null {
  if (!hasFirebaseEnv() || initFailed) return null;
  if (!app) {
    try {
      const config = readFirebaseEnv();
      app = getApps().length ? getApps()[0]! : initializeApp(config);
    } catch (error) {
      console.error("Firebase initialization failed:", error);
      initFailed = true;
      return null;
    }
  }
  return app;
}

export function getFirebaseDb(): Firestore | null {
  if (!hasFirebaseEnv() || initFailed) return null;
  if (!db) {
    const firebaseApp = getFirebaseApp();
    if (!firebaseApp) return null;
    try {
      db = getFirestore(firebaseApp);
    } catch (error) {
      console.error("Firestore initialization failed:", error);
      return null;
    }
  }
  return db;
}

export function getFirebaseStorage(): FirebaseStorage | null {
  if (!hasFirebaseEnv() || initFailed) return null;
  if (!storage) {
    const firebaseApp = getFirebaseApp();
    if (!firebaseApp) return null;
    try {
      storage = getStorage(firebaseApp);
    } catch (error) {
      console.error("Firebase Storage initialization failed:", error);
      return null;
    }
  }
  return storage;
}

export function isFirebaseConfigured(): boolean {
  return hasFirebaseEnv() && !initFailed;
}

export function resetFirebaseInitForDev(): void {
  if (process.env.NODE_ENV === "production") return;
  initFailed = false;
}
