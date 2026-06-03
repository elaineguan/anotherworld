"use client";

export function WelcomeNode() {
  return (
    <div className="pointer-events-none w-[min(100vw-3rem,448px)] select-none">
      <div className="flex flex-col items-center text-center">
        <h2 className="font-garamond-narrow text-[32px] leading-tight text-[#5A5A5A]">
          Welcome, Traveler.
        </h2>
        <p className="mt-4 font-[family-name:var(--font-manrope)] text-base leading-relaxed text-[#5A5A5A]">
          This canvas holds the memories, observations, and traces left behind by
          our collective consciousness. Add what you&apos;ve seen, what you&apos;ve
          learned, or what you don&apos;t want forgotten.
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/isekai-banner-transparent.png"
          alt="Isekai x Experiment"
          className="mt-[20px] h-auto w-[min(100%,320px)] object-contain"
          draggable={false}
        />
      </div>
    </div>
  );
}
