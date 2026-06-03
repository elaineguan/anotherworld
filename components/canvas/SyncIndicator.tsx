"use client";

import { isFirebaseConfigured } from "@/lib/firebase";
import { useCanvasStore } from "@/store/canvasStore";

export function SyncIndicator() {
  const firebaseReady = useCanvasStore((s) => s.firebaseReady);
  const syncError = useCanvasStore((s) => s.syncError);
  const configured = isFirebaseConfigured();

  let message: string;
  let className = "text-[#949494]";

  if (!configured) {
    message = "this device only · add Firebase env vars to share";
  } else if (syncError) {
    message = `sync error · ${syncError}`;
    className = "text-[#8B4513]";
  } else if (firebaseReady) {
    message = "shared canvas · live sync";
  } else {
    message = "connecting to shared canvas…";
  }

  return (
    <p
      className={`pointer-events-none m-5 mt-0 max-w-xs font-[family-name:var(--font-dm-mono)] text-[11px] leading-snug ${className}`}
    >
      {message}
    </p>
  );
}
