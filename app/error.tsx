"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F8F6F2] px-6 text-center text-[#5A5A5A]">
      <p className="font-[family-name:var(--font-eb-garamond)] text-[32px]">
        The memory frayed for a moment.
      </p>
      <p className="mt-4 max-w-md font-[family-name:var(--font-dm-mono)] text-sm text-[#949494]">
        Something went wrong while loading the archive.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-10 border border-[#5A5A5A] px-8 py-2.5 font-[family-name:var(--font-eb-garamond)] text-lg transition-opacity hover:opacity-60"
      >
        Try again
      </button>
    </div>
  );
}
