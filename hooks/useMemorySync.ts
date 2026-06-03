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
import {
  applyEditingImageOverrides,
  applyEditingNoteOverrides,
} from "@/lib/editing-registry";
import {
  confirmPendingDrawingDeletesInRemote,
  confirmPendingImageDeletesInRemote,
  confirmPendingNoteDeletesInRemote,
  isDrawingDeleted,
  isImageDeleted,
  isNoteDeleted,
  markDrawingDeleted,
  markImageDeleted,
  markNoteDeleted,
  clearNoteDeletion,
  clearImageDeletion,
  clearDrawingDeletion,
  withoutDeletedDrawings,
  withoutDeletedImages,
  withoutDeletedNotes,
  withoutPendingDrawingDeletes,
  withoutPendingImageDeletes,
  withoutPendingNoteDeletes,
} from "@/lib/deletion-registry";

let memorySyncSessionStarted = false;
let syncGeneration = 0;

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

  const safeNotes = withoutDeletedNotes(notes);
  const safeImages = withoutDeletedImages(cloudSafeImages(images));
  const safeDrawings = withoutDeletedDrawings(drawings);

  await Promise.all([
    ...safeNotes.map((n) => saveNote(n)),
    ...safeImages.map((i) => saveImage(i)),
    ...safeDrawings.map((d) => saveDrawing(d)),
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

  const uniqueNotes = [...new Map(noteUploads.map((n) => [n.id, n])).values()].filter(
    (n) => !isNoteDeleted(n.id)
  );
  const uniqueImages = [
    ...new Map(imageUploads.map((i) => [i.id, i])).values(),
  ]
    .filter(canSyncImageToFirestore)
    .filter((i) => !isImageDeleted(i.id));

  await Promise.all([
    ...uniqueNotes.map((n) => saveNote(n)),
    ...uniqueImages.map((i) => saveImage(i)),
    ...drawingUploads.filter((d) => !isDrawingDeleted(d.id)).map((d) => saveDrawing(d)),
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
    const generation = ++syncGeneration;
    initialPushDone.current = false;
    unsubsRef.current = {};

    const isStale = () => cancelled || generation !== syncGeneration;

    const localNotes = withoutDeletedNotes(loadLocalNotes());
    const localImages = withoutDeletedImages(loadLocalImages());
    const localDrawings = withoutDeletedDrawings(loadLocalDrawings());

    if (!memorySyncSessionStarted) {
      memorySyncSessionStarted = true;
      setNotes(localNotes);
      setImages(localImages);
      setDrawings(localDrawings);
    }

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
          useCanvasStore.getState().notes,
          isNoteDeleted
        );
        const mergedImages = mergeImages(
          remoteImages,
          useCanvasStore.getState().images,
          isImageDeleted
        );
        const mergedDrawings = mergeDrawings(
          remoteDrawings,
          useCanvasStore.getState().drawings,
          isDrawingDeleted
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
        if (isStale()) return;
        remoteNotes = remote;
        setSyncError(null);
        const local = withoutDeletedNotes(useCanvasStore.getState().notes);
        const filteredRemote = withoutPendingNoteDeletes(remote);
        confirmPendingNoteDeletesInRemote(remote);
        const merged = withoutDeletedNotes(
          applyEditingNoteOverrides(
            mergeNotes(filteredRemote, local, isNoteDeleted),
            local
          )
        );
        setNotes(merged);
        saveLocalNotes(merged);
        maybeInitialPush();
      }, onSyncError);

      unsubsRef.current.images = subscribeImages((remote) => {
        if (isStale()) return;
        remoteImages = remote;
        setSyncError(null);
        const local = withoutDeletedImages(useCanvasStore.getState().images);
        const filteredRemote = withoutPendingImageDeletes(remote);
        confirmPendingImageDeletesInRemote(remote);
        const merged = withoutDeletedImages(
          applyEditingImageOverrides(
            mergeImages(filteredRemote, local, isImageDeleted),
            local
          )
        );
        setImages(merged);
        saveLocalImages(merged);
        maybeInitialPush();
      }, onSyncError);

      unsubsRef.current.drawings = subscribeDrawings((remote) => {
        if (isStale()) return;
        remoteDrawings = remote;
        setSyncError(null);
        const local = withoutDeletedDrawings(useCanvasStore.getState().drawings);
        const filteredRemote = withoutPendingDrawingDeletes(remote);
        confirmPendingDrawingDeletesInRemote(remote);
        const merged = withoutDeletedDrawings(
          mergeDrawings(filteredRemote, local, isDrawingDeleted)
        );
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
    saveLocalNotes(withoutDeletedNotes(notes));
  }, [notes, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    saveLocalImages(withoutDeletedImages(images));
  }, [images, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    saveLocalDrawings(withoutDeletedDrawings(drawings));
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
  for (const note of snapshot.notes) clearNoteDeletion(note.id);
  for (const image of snapshot.images) clearImageDeletion(image.id);
  for (const drawing of snapshot.drawings) clearDrawingDeletion(drawing.id);

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

export async function saveNoteToCloud(note: NoteMemory): Promise<void> {
  if (isNoteDeleted(note.id)) return;
  if (!(await ensureFirebaseInitialized())) return;

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

export async function persistNote(
  note: NoteMemory,
  trackHistory = true
): Promise<void> {
  if (isNoteDeleted(note.id)) return;
  if (trackHistory) recordHistory();
  useCanvasStore.getState().upsertNote(note);
  await saveNoteToCloud(note);
}

export async function saveImageToCloud(image: ImageMemory): Promise<void> {
  if (isImageDeleted(image.id)) return;
  if (!(await ensureFirebaseInitialized())) return;

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

export async function persistImage(
  image: ImageMemory,
  trackHistory = true
): Promise<void> {
  if (isImageDeleted(image.id)) return;
  if (trackHistory) recordHistory();
  useCanvasStore.getState().upsertImage(image);
  await saveImageToCloud(image);
}

export async function persistDrawing(path: DrawingPath): Promise<void> {
  if (isDrawingDeleted(path.id)) return;
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
  if (isNoteDeleted(id)) return;
  recordHistory();
  markNoteDeleted(id);
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
  if (isImageDeleted(id)) return;
  recordHistory();
  markImageDeleted(id);
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
  if (isDrawingDeleted(id)) return;
  recordHistory();
  markDrawingDeleted(id);
  const store = useCanvasStore.getState();
  store.removeDrawing(id);
  saveLocalDrawings(store.drawings);

  if (await ensureFirebaseInitialized()) {
    try {
      await deleteDrawing(id);
      useCanvasStore.getState().setSyncError(null);
    } catch (err) {
      console.error("Failed to delete drawing from cloud:", err);
      useCanvasStore
        .getState()
        .setSyncError(
          err instanceof Error ? formatSyncError(err) : "Failed to delete drawing"
        );
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
