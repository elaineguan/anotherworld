"use client";

import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { isFirebaseConfigured } from "@/lib/firebase";
import {
  subscribeNotes,
  subscribeImages,
  subscribeDrawings,
  saveNote,
  saveImage,
  saveDrawing,
  deleteNote,
  deleteImage,
  deleteDrawing,
} from "@/lib/firestore";
import {
  loadLocalNotes,
  loadLocalImages,
  loadLocalDrawings,
  saveLocalNotes,
  saveLocalImages,
  saveLocalDrawings,
} from "@/lib/local-persistence";
import { useCanvasStore } from "@/store/canvasStore";
import { recordHistory } from "@/store/historyStore";
import type { NoteMemory, ImageMemory, DrawingPath } from "@/types";
import type { CanvasSnapshot } from "@/store/historyStore";

function preferLocalWhenRemoteEmpty<T>(
  remote: T[],
  loadLocal: () => T[]
): T[] {
  if (remote.length > 0) return remote;
  const local = loadLocal();
  return local.length > 0 ? local : remote;
}

export function useMemorySync() {
  const setNotes = useCanvasStore((s) => s.setNotes);
  const setImages = useCanvasStore((s) => s.setImages);
  const setDrawings = useCanvasStore((s) => s.setDrawings);
  const setFirebaseReady = useCanvasStore((s) => s.setFirebaseReady);
  const notes = useCanvasStore((s) => s.notes);
  const images = useCanvasStore((s) => s.images);
  const drawings = useCanvasStore((s) => s.drawings);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const localNotes = loadLocalNotes();
    const localImages = loadLocalImages();
    const localDrawings = loadLocalDrawings();

    setNotes(localNotes);
    setImages(localImages);
    setDrawings(localDrawings);
    saveLocalNotes(localNotes);
    saveLocalImages(localImages);
    saveLocalDrawings(localDrawings);

    if (isFirebaseConfigured()) {
      const onSyncError = (error: Error) => {
        console.error("Memory sync error:", error);
      };

      const unsubNotes = subscribeNotes((remote) => {
        const merged = preferLocalWhenRemoteEmpty(remote, loadLocalNotes);
        setNotes(merged);
        saveLocalNotes(merged);
      }, onSyncError);

      const unsubImages = subscribeImages((remote) => {
        const merged = preferLocalWhenRemoteEmpty(remote, loadLocalImages);
        setImages(merged);
        saveLocalImages(merged);
      }, onSyncError);

      const unsubDrawings = subscribeDrawings((remote) => {
        const merged = preferLocalWhenRemoteEmpty(remote, loadLocalDrawings);
        setDrawings(merged);
        saveLocalDrawings(merged);
      }, onSyncError);

      if (unsubNotes || unsubImages || unsubDrawings) {
        setFirebaseReady(true);
        setHydrated(true);
        return () => {
          unsubNotes?.();
          unsubImages?.();
          unsubDrawings?.();
        };
      }
    }

    setFirebaseReady(false);
    setHydrated(true);
  }, [setNotes, setImages, setDrawings, setFirebaseReady]);

  useEffect(() => {
    if (!hydrated) return;
    saveLocalNotes(notes);
  }, [notes, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    saveLocalImages(images);
  }, [images, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    saveLocalDrawings(drawings);
  }, [drawings, hydrated]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const scheduleSave = () => {
      if (timer !== undefined) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = undefined;
        void saveAllMemories();
      }, 1200);
    };

    const unsub = useCanvasStore.subscribe((state, prevState) => {
      if (
        state.notes !== prevState.notes ||
        state.images !== prevState.images ||
        state.drawings !== prevState.drawings
      ) {
        scheduleSave();
      }
    });

    const interval = setInterval(() => void saveAllMemories(), 15000);

    const onBeforeUnload = () => {
      const { notes: n, images: i, drawings: d } = useCanvasStore.getState();
      saveLocalNotes(n);
      saveLocalImages(i);
      saveLocalDrawings(d);
    };

    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      unsub();
      if (timer !== undefined) clearTimeout(timer);
      clearInterval(interval);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, []);
}

export async function applyCanvasSnapshot(snapshot: CanvasSnapshot): Promise<void> {
  const store = useCanvasStore.getState();
  const prevNotes = store.notes;
  const prevImages = store.images;
  const prevDrawings = store.drawings;

  store.setNotes(snapshot.notes);
  store.setImages(snapshot.images);
  store.setDrawings(snapshot.drawings);

  if (!isFirebaseConfigured()) {
    saveLocalNotes(snapshot.notes);
    saveLocalImages(snapshot.images);
    saveLocalDrawings(snapshot.drawings);
    return;
  }

  await Promise.all([
    ...prevNotes
      .filter((n) => !snapshot.notes.some((s) => s.id === n.id))
      .map((n) => deleteNote(n.id)),
    ...prevImages
      .filter((i) => !snapshot.images.some((s) => s.id === i.id))
      .map((i) => deleteImage(i.id)),
    ...prevDrawings
      .filter((d) => !snapshot.drawings.some((s) => s.id === d.id))
      .map((d) => deleteDrawing(d.id)),
    ...snapshot.notes.map((n) => saveNote(n)),
    ...snapshot.images.map((i) => saveImage(i)),
    ...snapshot.drawings.map((d) => saveDrawing(d)),
  ]);
}

export async function saveAllMemories(): Promise<void> {
  const { notes, images, drawings } = useCanvasStore.getState();

  saveLocalNotes(notes);
  saveLocalImages(images);
  saveLocalDrawings(drawings);

  if (isFirebaseConfigured()) {
    await Promise.all([
      ...notes.map((n) => saveNote(n)),
      ...images.map((i) => saveImage(i)),
      ...drawings.map((d) => saveDrawing(d)),
    ]);
  }
}

export async function persistNote(
  note: NoteMemory,
  trackHistory = true
): Promise<void> {
  if (trackHistory) recordHistory();
  useCanvasStore.getState().upsertNote(note);
}

export async function persistImage(
  image: ImageMemory,
  trackHistory = true
): Promise<void> {
  if (trackHistory) recordHistory();
  useCanvasStore.getState().upsertImage(image);
}

export async function persistDrawing(path: DrawingPath): Promise<void> {
  recordHistory();
  useCanvasStore.getState().upsertDrawing(path);
  if (isFirebaseConfigured()) {
    await saveDrawing(path);
  }
}

export async function removeDrawingMemory(id: string): Promise<void> {
  recordHistory();
  useCanvasStore.getState().removeDrawing(id);
  if (isFirebaseConfigured()) {
    await deleteDrawing(id);
  }
}

export function createNoteAt(x: number, y: number): NoteMemory {
  const now = Date.now();
  return {
    id: uuidv4(),
    content: "",
    x,
    y,
    width: 220,
    height: 140,
    createdAt: now,
    updatedAt: now,
  };
}

export function createImageMemory(
  storageUrl: string,
  x: number,
  y: number,
  width: number,
  height: number
): ImageMemory {
  const now = Date.now();
  return {
    id: uuidv4(),
    caption: "",
    x,
    y,
    width,
    height,
    storageUrl,
    createdAt: now,
    updatedAt: now,
  };
}
