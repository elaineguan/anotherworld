"use client";

import { useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { ensureFirebaseInitialized } from "@/lib/firebase";
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
import {
  mergeNotes,
  mergeImages,
  mergeDrawings,
  itemsMissingFromRemote,
  itemsNewerThanRemote,
} from "@/lib/merge-memories";
import { useCanvasStore } from "@/store/canvasStore";
import { recordHistory } from "@/store/historyStore";
import type { NoteMemory, ImageMemory, DrawingPath } from "@/types";
import type { CanvasSnapshot } from "@/store/historyStore";
import { canSyncImageToFirestore } from "@/lib/image-sync";

/** Keep deleted items from reappearing while Firestore catches up. */
const pendingDeletedNoteIds = new Set<string>();
const pendingDeletedImageIds = new Set<string>();

function withoutPendingDeletes<T extends { id: string }>(
  items: T[],
  pending: Set<string>
): T[] {
  return items.filter((item) => !pending.has(item.id));
}

function formatSyncError(error: Error): string {
  const code = (error as { code?: string }).code ?? "";
  const msg = error.message || "";
  if (msg.includes("storageUrl") && msg.includes("longer than")) {
    return "a memento image is too large — delete old mementos and re-add photos";
  }
  if (code === "permission-denied") {
    return "Firestore blocked sync — publish firestore.rules in Firebase console";
  }
  if (code === "not-found" || code === "failed-precondition") {
    return "Create a Firestore database in Firebase console (Build → Firestore)";
  }
  return msg || "Cloud sync failed";
}

function cloudSafeImages(images: ImageMemory[]): ImageMemory[] {
  return images.filter(canSyncImageToFirestore);
}

async function persistToCloud(
  notes: NoteMemory[],
  images: ImageMemory[],
  drawings: DrawingPath[]
): Promise<void> {
  if (!(await ensureFirebaseInitialized())) return;

  await Promise.all([
    ...notes.map((n) => saveNote(n)),
    ...cloudSafeImages(images).map((i) => saveImage(i)),
    ...drawings.map((d) => saveDrawing(d)),
  ]);
}

async function pushLocalOnlyToCloud(
  notes: NoteMemory[],
  images: ImageMemory[],
  drawings: DrawingPath[],
  remoteNotes: NoteMemory[],
  remoteImages: ImageMemory[],
  remoteDrawings: DrawingPath[]
): Promise<void> {
  const noteUploads = [
    ...itemsMissingFromRemote(notes, remoteNotes),
    ...itemsNewerThanRemote(notes, remoteNotes),
  ];
  const imageUploads = [
    ...itemsMissingFromRemote(images, remoteImages),
    ...itemsNewerThanRemote(images, remoteImages),
  ];
  const drawingUploads = itemsMissingFromRemote(drawings, remoteDrawings);

  const uniqueNotes = [...new Map(noteUploads.map((n) => [n.id, n])).values()];
  const uniqueImages = [
    ...new Map(imageUploads.map((i) => [i.id, i])).values(),
  ].filter(canSyncImageToFirestore);

  await Promise.all([
    ...uniqueNotes.map((n) => saveNote(n)),
    ...uniqueImages.map((i) => saveImage(i)),
    ...drawingUploads.map((d) => saveDrawing(d)),
  ]);
}

export function useMemorySync() {
  const setNotes = useCanvasStore((s) => s.setNotes);
  const setImages = useCanvasStore((s) => s.setImages);
  const setDrawings = useCanvasStore((s) => s.setDrawings);
  const setFirebaseReady = useCanvasStore((s) => s.setFirebaseReady);
  const setFirebaseConnected = useCanvasStore((s) => s.setFirebaseConnected);
  const setSyncInitialized = useCanvasStore((s) => s.setSyncInitialized);
  const setSyncError = useCanvasStore((s) => s.setSyncError);
  const notes = useCanvasStore((s) => s.notes);
  const images = useCanvasStore((s) => s.images);
  const drawings = useCanvasStore((s) => s.drawings);
  const [hydrated, setHydrated] = useState(false);
  const initialPushDone = useRef(false);
  const unsubsRef = useRef<{
    notes?: (() => void) | null;
    images?: (() => void) | null;
    drawings?: (() => void) | null;
  }>({});

  useEffect(() => {
    let cancelled = false;
    initialPushDone.current = false;
    unsubsRef.current = {};

    const localNotes = loadLocalNotes();
    const localImages = loadLocalImages();
    const localDrawings = loadLocalDrawings();

    setNotes(localNotes);
    setImages(localImages);
    setDrawings(localDrawings);

    void (async () => {
      const firebaseOk = await ensureFirebaseInitialized();
      if (cancelled) return;

      setSyncInitialized(true);

      if (!firebaseOk) {
        setFirebaseConnected(false);
        setFirebaseReady(false);
        setHydrated(true);
        return;
      }

      setFirebaseConnected(true);

      let remoteNotes: NoteMemory[] = [];
      let remoteImages: ImageMemory[] = [];
      let remoteDrawings: DrawingPath[] = [];
      let snapshotsReceived = 0;

      const maybeInitialPush = () => {
        snapshotsReceived += 1;
        if (snapshotsReceived < 3 || initialPushDone.current) return;

        initialPushDone.current = true;
        const mergedNotes = mergeNotes(
          remoteNotes,
          useCanvasStore.getState().notes
        );
        const mergedImages = mergeImages(
          remoteImages,
          useCanvasStore.getState().images
        );
        const mergedDrawings = mergeDrawings(
          remoteDrawings,
          useCanvasStore.getState().drawings
        );

        void pushLocalOnlyToCloud(
          mergedNotes,
          mergedImages,
          mergedDrawings,
          remoteNotes,
          remoteImages,
          remoteDrawings
        ).catch((err) => {
          console.error("Initial cloud upload failed:", err);
          setSyncError(
            err instanceof Error ? formatSyncError(err) : "Initial upload failed"
          );
        });
      };

      const onSyncError = (error: Error) => {
        console.error("Memory sync error:", error);
        setSyncError(formatSyncError(error));
        setFirebaseReady(false);
      };

      unsubsRef.current.notes = subscribeNotes((remote) => {
        remoteNotes = remote;
        setSyncError(null);
        const local = useCanvasStore.getState().notes;
        const filteredRemote = withoutPendingDeletes(
          remote,
          pendingDeletedNoteIds
        );
        for (const id of pendingDeletedNoteIds) {
          if (!remote.some((n) => n.id === id)) pendingDeletedNoteIds.delete(id);
        }
        const merged = mergeNotes(filteredRemote, local);
        setNotes(merged);
        saveLocalNotes(merged);
        maybeInitialPush();
      }, onSyncError);

      unsubsRef.current.images = subscribeImages((remote) => {
        remoteImages = remote;
        setSyncError(null);
        const local = useCanvasStore.getState().images;
        const filteredRemote = withoutPendingDeletes(
          remote,
          pendingDeletedImageIds
        );
        for (const id of pendingDeletedImageIds) {
          if (!remote.some((i) => i.id === id)) {
            pendingDeletedImageIds.delete(id);
          }
        }
        const merged = mergeImages(filteredRemote, local);
        setImages(merged);
        saveLocalImages(merged);
        maybeInitialPush();
      }, onSyncError);

      unsubsRef.current.drawings = subscribeDrawings((remote) => {
        remoteDrawings = remote;
        setSyncError(null);
        const local = useCanvasStore.getState().drawings;
        const merged = mergeDrawings(remote, local);
        setDrawings(merged);
        saveLocalDrawings(merged);
        maybeInitialPush();
      }, onSyncError);

      setFirebaseReady(true);
      setHydrated(true);

      if (cancelled) {
        unsubsRef.current.notes?.();
        unsubsRef.current.images?.();
        unsubsRef.current.drawings?.();
      }
    })();

    return () => {
      cancelled = true;
      unsubsRef.current.notes?.();
      unsubsRef.current.images?.();
      unsubsRef.current.drawings?.();
    };
  }, [
    setNotes,
    setImages,
    setDrawings,
    setFirebaseReady,
    setFirebaseConnected,
    setSyncInitialized,
    setSyncError,
  ]);

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
    if (!hydrated) return;

    let timer: ReturnType<typeof setTimeout> | undefined;

    const scheduleCloudSave = () => {
      if (!useCanvasStore.getState().firebaseConnected) return;
      if (timer !== undefined) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = undefined;
        const { notes: n, images: i, drawings: d } = useCanvasStore.getState();
        void persistToCloud(n, i, d).catch((err) => {
          console.error("Cloud save failed:", err);
          useCanvasStore
            .getState()
            .setSyncError(
              err instanceof Error ? formatSyncError(err) : "Cloud save failed"
            );
        });
      }, 800);
    };

    const unsub = useCanvasStore.subscribe((state, prevState) => {
      if (
        state.notes !== prevState.notes ||
        state.images !== prevState.images ||
        state.drawings !== prevState.drawings
      ) {
        scheduleCloudSave();
      }
    });

    const interval = setInterval(() => {
      if (!useCanvasStore.getState().firebaseConnected) return;
      const { notes: n, images: i, drawings: d } = useCanvasStore.getState();
      void persistToCloud(n, i, d).catch((err) => {
        console.error("Cloud save failed:", err);
      });
    }, 10000);

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
  }, [hydrated]);
}

export async function applyCanvasSnapshot(snapshot: CanvasSnapshot): Promise<void> {
  const store = useCanvasStore.getState();
  const prevNotes = store.notes;
  const prevImages = store.images;
  const prevDrawings = store.drawings;

  store.setNotes(snapshot.notes);
  store.setImages(snapshot.images);
  store.setDrawings(snapshot.drawings);

  saveLocalNotes(snapshot.notes);
  saveLocalImages(snapshot.images);
  saveLocalDrawings(snapshot.drawings);

  if (!(await ensureFirebaseInitialized())) return;

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

  if (await ensureFirebaseInitialized()) {
    await persistToCloud(notes, images, drawings);
    useCanvasStore.getState().setSyncError(null);
  }
}

export async function persistNote(
  note: NoteMemory,
  trackHistory = true
): Promise<void> {
  if (trackHistory) recordHistory();
  useCanvasStore.getState().upsertNote(note);

  if (await ensureFirebaseInitialized()) {
    try {
      await saveNote(note);
      useCanvasStore.getState().setSyncError(null);
    } catch (err) {
      console.error("Failed to save note to cloud:", err);
      useCanvasStore
        .getState()
        .setSyncError(
          err instanceof Error ? formatSyncError(err) : "Failed to save note"
        );
      throw err;
    }
  }
}

export async function persistImage(
  image: ImageMemory,
  trackHistory = true
): Promise<void> {
  if (trackHistory) recordHistory();
  useCanvasStore.getState().upsertImage(image);

  if (await ensureFirebaseInitialized()) {
    if (!canSyncImageToFirestore(image)) {
      useCanvasStore
        .getState()
        .setSyncError(
          "memento too large for cloud — use Add a Memento again (uploads to Storage)"
        );
      return;
    }
    try {
      await saveImage(image);
      useCanvasStore.getState().setSyncError(null);
    } catch (err) {
      console.error("Failed to save image to cloud:", err);
      useCanvasStore
        .getState()
        .setSyncError(
          err instanceof Error ? formatSyncError(err) : "Failed to save image"
        );
      throw err;
    }
  }
}

export async function persistDrawing(path: DrawingPath): Promise<void> {
  recordHistory();
  useCanvasStore.getState().upsertDrawing(path);

  if (await ensureFirebaseInitialized()) {
    try {
      await saveDrawing(path);
      useCanvasStore.getState().setSyncError(null);
    } catch (err) {
      console.error("Failed to save drawing to cloud:", err);
      useCanvasStore
        .getState()
        .setSyncError(
          err instanceof Error ? formatSyncError(err) : "Failed to save drawing"
        );
    }
  }
}

export async function removeNoteMemory(id: string): Promise<void> {
  recordHistory();
  pendingDeletedNoteIds.add(id);
  const store = useCanvasStore.getState();
  store.removeNote(id);
  saveLocalNotes(store.notes);

  if (await ensureFirebaseInitialized()) {
    try {
      await deleteNote(id);
      useCanvasStore.getState().setSyncError(null);
    } catch (err) {
      console.error("Failed to delete note from cloud:", err);
      useCanvasStore
        .getState()
        .setSyncError(
          err instanceof Error ? formatSyncError(err) : "Failed to delete note"
        );
      throw err;
    }
  }
}

export async function removeImageMemory(id: string): Promise<void> {
  recordHistory();
  pendingDeletedImageIds.add(id);
  const store = useCanvasStore.getState();
  store.removeImage(id);
  saveLocalImages(store.images);

  if (await ensureFirebaseInitialized()) {
    try {
      await deleteImage(id);
      useCanvasStore.getState().setSyncError(null);
    } catch (err) {
      console.error("Failed to delete image from cloud:", err);
      useCanvasStore
        .getState()
        .setSyncError(
          err instanceof Error ? formatSyncError(err) : "Failed to delete memento"
        );
      throw err;
    }
  }
}

export async function removeDrawingMemory(id: string): Promise<void> {
  recordHistory();
  useCanvasStore.getState().removeDrawing(id);

  if (await ensureFirebaseInitialized()) {
    try {
      await deleteDrawing(id);
    } catch (err) {
      console.error("Failed to delete drawing from cloud:", err);
    }
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
