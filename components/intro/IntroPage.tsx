"use client";

import { PixelLoader } from "@/components/landing/PixelLoader";
import { useUiStore } from "@/store/uiStore";

export function IntroPage() {
  const setPhase = useUiStore((s) => s.setPhase);
  const setCanvasFadeIn = useUiStore((s) => s.setCanvasFadeIn);
  const canvasFadeIn = useUiStore((s) => s.canvasFadeIn);

  const handleEnter = () => {
    setCanvasFadeIn(true);
    setTimeout(() => setPhase("canvas"), 1000);
  };

  return (
    <div
      className={`fade-in fixed inset-0 z-40 flex items-center justify-center bg-[#F8F6F2] transition-opacity duration-[1000ms] ease-in-out ${
        canvasFadeIn ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <div className="-translate-y-[80px] flex flex-col items-center">
        <PixelLoader />
        <h1 className="mt-[12px] font-[family-name:var(--font-eb-garamond)] text-[40px] leading-none text-[#5A5A5A]">
          Isekai x Experiment
        </h1>
        <p className="mt-3 font-[family-name:var(--font-dm-mono)] text-[20px] tracking-wide text-[#5A5A5A]">
          SPRING 2026
        </p>
        <button
          type="button"
          onClick={handleEnter}
          className="mt-14 cursor-pointer border border-[#5A5A5A] px-8 py-2.5 font-[family-name:var(--font-eb-garamond)] text-lg text-[#5A5A5A] transition-colors duration-500 hover:text-[#C8C4BC]"
        >
          [ ENTER ]
        </button>
      </div>
    </div>
  );
}
