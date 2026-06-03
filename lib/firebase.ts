import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function hasFirebaseConfig(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.projectId &&
      firebaseConfig.storageBucket
  );
}

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let initFailed = false;

export function getFirebaseApp(): FirebaseApp | null {
  if (!hasFirebaseConfig() || initFailed) return null;
  if (!app) {
    try {
      app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    } catch (error) {
      console.error("Firebase initialization failed:", error);
      initFailed = true;
      return null;
    }
  }
  return app;
}

export function getFirebaseDb(): Firestore | null {
  if (!hasFirebaseConfig() || initFailed) return null;
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
  if (!hasFirebaseConfig() || initFailed) return null;
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
  return hasFirebaseConfig() && !initFailed;
}
