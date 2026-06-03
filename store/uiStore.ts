import { create } from "zustand";
import type { AppPhase } from "@/types";

interface UiState {
  phase: AppPhase;
  setPhase: (phase: AppPhase) => void;
  loadingFadeOut: boolean;
  setLoadingFadeOut: (value: boolean) => void;
  canvasFadeIn: boolean;
  setCanvasFadeIn: (value: boolean) => void;
  saveToastVisible: boolean;
  showSaveToast: () => void;
  hideSaveToast: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  phase: "loading",
  setPhase: (phase) => set({ phase }),
  loadingFadeOut: false,
  setLoadingFadeOut: (loadingFadeOut) => set({ loadingFadeOut }),
  canvasFadeIn: false,
  setCanvasFadeIn: (canvasFadeIn) => set({ canvasFadeIn }),
  saveToastVisible: false,
  showSaveToast: () => set({ saveToastVisible: true }),
  hideSaveToast: () => set({ saveToastVisible: false }),
}));
