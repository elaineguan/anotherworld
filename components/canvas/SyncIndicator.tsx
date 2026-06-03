"use client";

import { useCanvasStore } from "@/store/canvasStore";

function isLocalDevHost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1";
}

export function SyncIndicator() {
  const firebaseReady = useCanvasStore((s) => s.firebaseReady);
  const firebaseConnected = useCanvasStore((s) => s.firebaseConnected);
  const syncInitialized = useCanvasStore((s) => s.syncInitialized);
  const syncError = useCanvasStore((s) => s.syncError);

  let message: string;
  let className = "text-[#949494]";

  if (!syncInitialized) {
    message = "connecting to shared canvas…";
  } else if (syncError) {
    message = `sync error · ${syncError}`;
    className = "text-[#8B4513]";
  } else if (firebaseConnected && firebaseReady) {
    message = "shared canvas · live sync";
  } else if (!firebaseConnected) {
    message = isLocalDevHost()
      ? "this device only · check .env.local and restart npm run dev"
      : "this device only · add Firebase env vars on Vercel, then redeploy";
  } else {
    message = "connecting to shared canvas…";
  }

  return (
    <p
      className={`pointer-events-none m-5 mt-0 max-w-xs font-[family-name:var(--font-dm-mono)] text-[11px] leading-snug ${className}`}
      title={
        !firebaseConnected && syncInitialized && !isLocalDevHost()
          ? "Vercel → Settings → Environment Variables → all NEXT_PUBLIC_FIREBASE_* → Redeploy (uncheck build cache)"
          : undefined
      }
    >
      {message}
    </p>
  );
}
