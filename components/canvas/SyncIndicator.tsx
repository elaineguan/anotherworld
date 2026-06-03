"use client";

import { isFirebaseConfigured } from "@/lib/firebase";
import { useCanvasStore } from "@/store/canvasStore";

export function SyncIndicator() {
  const firebaseReady = useCanvasStore((s) => s.firebaseReady);
  const shared = isFirebaseConfigured() && firebaseReady;

  return (
    <p
      className="pointer-events-none m-5 mt-0 font-[family-name:var(--font-dm-mono)] text-[11px] leading-snug text-[#949494]"
      title={
        shared
          ? "Notes and mementos sync live for everyone via Firebase."
          : "Add Firebase env vars on Vercel (or .env.local) for a shared canvas."
      }
    >
      {shared ? "shared canvas · live sync" : "this device only · add Firebase to share"}
    </p>
  );
}
