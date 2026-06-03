"use client";

import { useCallback } from "react";
import { PixelLoader } from "./PixelLoader";
import { useTypewriter } from "@/hooks/useTypewriter";
import { useUiStore } from "@/store/uiStore";

const PHRASES = [
  "Loading...",
  "Welcome, Traveler.",
  "You seem like you're lost...",
  "...but don't worry.",
  "You're exactly where you're meant to be.",
];

export function LoadingScreen() {
  const setPhase = useUiStore((s) => s.setPhase);
  const setLoadingFadeOut = useUiStore((s) => s.setLoadingFadeOut);
  const loadingFadeOut = useUiStore((s) => s.loadingFadeOut);

  const handleComplete = useCallback(() => {
    setLoadingFadeOut(true);
    setTimeout(() => setPhase("intro"), 1200);
  }, [setPhase, setLoadingFadeOut]);

  const { displayText, isBackspacing } = useTypewriter({
    phrases: PHRASES,
    typeSpeedMs: 78,
    backspaceSpeedMs: 42,
    pauseAfterTypeMs: 1600,
    pauseBeforeBackspaceMs: 700,
    onComplete: handleComplete,
  });

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-[#F8F6F2] transition-opacity duration-[1200ms] ease-in-out ${
        loadingFadeOut ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <div className="-translate-y-[80px] flex flex-col items-center">
        <PixelLoader />
        <p className="mt-[12px] min-h-[32px] text-center font-[family-name:var(--font-eb-garamond)] text-[32px] leading-none text-[#5A5A5A]">
          {displayText}
          {displayText.length > 0 && !isBackspacing && (
            <span className="inline-block w-[2px] animate-pulse opacity-60">
              |
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
