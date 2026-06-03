"use client";

import dynamic from "next/dynamic";
import { LoadingScreen } from "@/components/landing/LoadingScreen";
import { IntroPage } from "@/components/intro/IntroPage";
import { useUiStore } from "@/store/uiStore";

const MemoryCanvas = dynamic(() => import("@/components/canvas/MemoryCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#F8F6F2]" />
  ),
});

export function AppShell() {
  const phase = useUiStore((s) => s.phase);
  const canvasFadeIn = useUiStore((s) => s.canvasFadeIn);

  return (
    <main className="relative min-h-dvh h-dvh w-full overflow-hidden bg-[#F8F6F2]">
      {phase === "loading" && <LoadingScreen />}
      {phase === "intro" && <IntroPage />}
      {(phase === "canvas" || canvasFadeIn) && (
        <div className="absolute inset-0 z-30 h-full min-h-0">
          <MemoryCanvas />
        </div>
      )}
    </main>
  );
}
