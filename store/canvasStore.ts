import { create } from "zustand";
import type { CanvasTool, NoteMemory, ImageMemory, DrawingPath } from "@/types";

interface CanvasState {
  tool: CanvasTool;
  setTool: (tool: CanvasTool) => void;
  notes: NoteMemory[];
  images: ImageMemory[];
  drawings: DrawingPath[];
  setNotes: (notes: NoteMemory[]) => void;
  setImages: (images: ImageMemory[]) => void;
  setDrawings: (drawings: DrawingPath[]) => void;
  upsertNote: (note: NoteMemory) => void;
  upsertImage: (image: ImageMemory) => void;
  upsertDrawing: (path: DrawingPath) => void;
  removeDrawing: (id: string) => void;
  removeNote: (id: string) => void;
  removeImage: (id: string) => void;
  firebaseReady: boolean;
  setFirebaseReady: (ready: boolean) => void;
}

export const useCanvasStore = create<CanvasState>((set) => ({
  tool: "select",
  setTool: (tool) => set({ tool }),
  notes: [],
  images: [],
  drawings: [],
  setNotes: (notes) => set({ notes }),
  setImages: (images) => set({ images }),
  setDrawings: (drawings) => set({ drawings }),
  upsertNote: (note) =>
    set((state) => {
      const idx = state.notes.findIndex((n) => n.id === note.id);
      const notes =
        idx >= 0
          ? state.notes.map((n) => (n.id === note.id ? note : n))
          : [...state.notes, note];
      return { notes };
    }),
  upsertImage: (image) =>
    set((state) => {
      const idx = state.images.findIndex((i) => i.id === image.id);
      const images =
        idx >= 0
          ? state.images.map((i) => (i.id === image.id ? image : i))
          : [...state.images, image];
      return { images };
    }),
  upsertDrawing: (path) =>
    set((state) => {
      const idx = state.drawings.findIndex((d) => d.id === path.id);
      const drawings =
        idx >= 0
          ? state.drawings.map((d) => (d.id === path.id ? path : d))
          : [...state.drawings, path];
      return { drawings };
    }),
  removeDrawing: (id) =>
    set((state) => ({
      drawings: state.drawings.filter((d) => d.id !== id),
    })),
  removeNote: (id) =>
    set((state) => ({
      notes: state.notes.filter((n) => n.id !== id),
    })),
  removeImage: (id) =>
    set((state) => ({
      images: state.images.filter((i) => i.id !== id),
    })),
  firebaseReady: false,
  setFirebaseReady: (firebaseReady) => set({ firebaseReady }),
}));
