export type FirebaseClientConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

export function isValidFirebaseConfig(
  config: FirebaseClientConfig | null | undefined
): boolean {
  if (!config) return false;
  return Boolean(
    config.apiKey && config.projectId && config.storageBucket
  );
}

/** Build-time env (works locally after dev server restart). */
export function readFirebaseEnv(): FirebaseClientConfig {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
  };
}

export function hasFirebaseEnv(): boolean {
  return isValidFirebaseConfig(readFirebaseEnv());
}
