"use client";

import { useCallback, useEffect } from "react";
import {
  useHistoryStore,
  getCanvasSnapshot,
  runWithoutHistory,
} from "@/store/historyStore";
import { applyCanvasSnapshot } from "@/hooks/useMemorySync";

export function useUndoRedo() {
  const canUndo = useHistoryStore((s) => s.past.length > 0);
  const canRedo = useHistoryStore((s) => s.future.length > 0);

  const undo = useCallback(async () => {
    const snapshot = useHistoryStore.getState().popUndo();
    if (!snapshot) return;

    const current = getCanvasSnapshot();
    useHistoryStore.getState().pushRedo(current);
    await runWithoutHistory(() => applyCanvasSnapshot(snapshot));
  }, []);

  const redo = useCallback(async () => {
    const snapshot = useHistoryStore.getState().popRedo();
    if (!snapshot) return;

    const current = getCanvasSnapshot();
    useHistoryStore.getState().pushPast(current);
    await runWithoutHistory(() => applyCanvasSnapshot(snapshot));
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        void undo();
      }
      if (
        (e.metaKey || e.ctrlKey) &&
        (e.key === "y" || (e.key === "z" && e.shiftKey))
      ) {
        e.preventDefault();
        void redo();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo]);

  return { undo, redo, canUndo, canRedo };
}
