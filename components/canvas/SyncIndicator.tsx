"use client";

import { useEffect, useState } from "react";
import { getFirebaseEnvStatus } from "@/lib/firebase-config";
import { isFirebaseConfigured } from "@/lib/firebase";
import { useCanvasStore } from "@/store/canvasStore";

export function SyncIndicator() {
  const firebaseReady = useCanvasStore((s) => s.firebaseReady);
  const syncError = useCanvasStore((s) => s.syncError);
  const [envStatus, setEnvStatus] = useState(() => getFirebaseEnvStatus());

  useEffect(() => {
    setEnvStatus(getFirebaseEnvStatus());
  }, []);

  const configured = envStatus.configured && isFirebaseConfigured();

  let message: string;
  let className = "text-[#949494]";

  if (!envStatus.configured) {
    const hint =
      envStatus.missing.length > 0
        ? ` (missing ${envStatus.missing.join(", ")})`
        : "";
    message = `this device only · restart dev server after .env.local${hint}`;
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
