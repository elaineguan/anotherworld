/** Read Firebase env at call time so Next.js client bundles pick up .env.local after restart. */
export function readFirebaseEnv() {
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
  const { apiKey, projectId, storageBucket } = readFirebaseEnv();
  return Boolean(apiKey && projectId && storageBucket);
}

export type FirebaseEnvStatus = {
  configured: boolean;
  missing: string[];
};

export function getFirebaseEnvStatus(): FirebaseEnvStatus {
  const env = readFirebaseEnv();
  const missing: string[] = [];
  if (!env.apiKey) missing.push("API_KEY");
  if (!env.projectId) missing.push("PROJECT_ID");
  if (!env.storageBucket) missing.push("STORAGE_BUCKET");
  return { configured: missing.length === 0, missing };
}
