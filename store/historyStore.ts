import { create } from "zustand";
import type { NoteMemory, ImageMemory, DrawingPath } from "@/types";
import { useCanvasStore } from "./canvasStore";

export interface CanvasSnapshot {
  notes: NoteMemory[];
  images: ImageMemory[];
  drawings: DrawingPath[];
}

interface HistoryState {
  past: CanvasSnapshot[];
  future: CanvasSnapshot[];
  push: (snapshot: CanvasSnapshot) => void;
  popUndo: () => CanvasSnapshot | null;
  popRedo: () => CanvasSnapshot | null;
  pushRedo: (snapshot: CanvasSnapshot) => void;
  pushPast: (snapshot: CanvasSnapshot) => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  past: [],
  future: [],
  push: (snapshot) =>
    set((state) => ({
      past: [...state.past.slice(-49), snapshot],
      future: [],
    })),
  popUndo: () => {
    const { past } = get();
    if (past.length === 0) return null;
    const previous = past[past.length - 1];
    set({ past: past.slice(0, -1) });
    return previous;
  },
  popRedo: () => {
    const { future } = get();
    if (future.length === 0) return null;
    const next = future[0];
    set({ future: future.slice(1) });
    return next;
  },
  pushRedo: (snapshot) =>
    set((state) => ({ future: [snapshot, ...state.future] })),
  pushPast: (snapshot) =>
    set((state) => ({ past: [...state.past, snapshot] })),
  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,
}));

export function getCanvasSnapshot(): CanvasSnapshot {
  const { notes, images, drawings } = useCanvasStore.getState();
  return {
    notes: structuredClone(notes),
    images: structuredClone(images),
    drawings: structuredClone(drawings),
  };
}

let skipHistory = false;

export function shouldSkipHistory(): boolean {
  return skipHistory;
}

export function runWithoutHistory(fn: () => void | Promise<void>): void | Promise<void> {
  skipHistory = true;
  const result = fn();
  if (result instanceof Promise) {
    return result.finally(() => {
      skipHistory = false;
    });
  }
  skipHistory = false;
}

export function recordHistory(): void {
  if (skipHistory) return;
  useHistoryStore.getState().push(getCanvasSnapshot());
}
