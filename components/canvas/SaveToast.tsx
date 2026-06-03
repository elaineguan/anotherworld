"use client";

import { useEffect, useRef } from "react";
import { useUiStore } from "@/store/uiStore";

export function SaveToast() {
  const visible = useUiStore((s) => s.saveToastVisible);
  const hideSaveToast = useUiStore((s) => s.hideSaveToast);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => hideSaveToast(), 2000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [visible, hideSaveToast]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
      <div className="fade-in rounded-sm border border-[#D8D4CC] bg-[#F8F6F2]/95 px-5 py-2.5 font-[family-name:var(--font-dm-mono)] text-sm text-[#5A5A5A] shadow-sm backdrop-blur-sm">
        progress saved!
      </div>
    </div>
  );
}
