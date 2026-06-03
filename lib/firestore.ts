import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { ensureFirebaseInitialized, getFirebaseDb } from "./firebase";
import type { NoteMemory, ImageMemory, DrawingPath } from "@/types";

const NOTES = "notes";
const IMAGES = "images";
const DRAWINGS = "drawings";

async function dbOrNull() {
  const ok = await ensureFirebaseInitialized();
  if (!ok) return null;
  return getFirebaseDb();
}

export function subscribeNotes(
  onData: (notes: NoteMemory[]) => void,
  onError?: (error: Error) => void
): Unsubscribe | null {
  let unsub: Unsubscribe | null = null;

  void dbOrNull().then((db) => {
    if (!db) return;
    unsub = onSnapshot(
      collection(db, NOTES),
      (snapshot) => {
        const notes = snapshot.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as NoteMemory
        );
        onData(notes);
      },
      (err) => onError?.(err)
    );
  });

  return () => unsub?.();
}

export function subscribeImages(
  onData: (images: ImageMemory[]) => void,
  onError?: (error: Error) => void
): Unsubscribe | null {
  let unsub: Unsubscribe | null = null;

  void dbOrNull().then((db) => {
    if (!db) return;
    unsub = onSnapshot(
      collection(db, IMAGES),
      (snapshot) => {
        const images = snapshot.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as ImageMemory
        );
        onData(images);
      },
      (err) => onError?.(err)
    );
  });

  return () => unsub?.();
}

export function subscribeDrawings(
  onData: (paths: DrawingPath[]) => void,
  onError?: (error: Error) => void
): Unsubscribe | null {
  let unsub: Unsubscribe | null = null;

  void dbOrNull().then((db) => {
    if (!db) return;
    unsub = onSnapshot(
      collection(db, DRAWINGS),
      (snapshot) => {
        const paths = snapshot.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as DrawingPath
        );
        onData(paths);
      },
      (err) => onError?.(err)
    );
  });

  return () => unsub?.();
}

export async function saveNote(note: NoteMemory): Promise<void> {
  const db = await dbOrNull();
  if (!db) return;
  const { id, ...data } = note;
  await setDoc(doc(db, NOTES, id), data, { merge: true });
}

export async function deleteNote(id: string): Promise<void> {
  const db = await dbOrNull();
  if (!db) return;
  await deleteDoc(doc(db, NOTES, id));
}

export async function saveImage(image: ImageMemory): Promise<void> {
  const db = await dbOrNull();
  if (!db) return;
  const { id, ...data } = image;
  await setDoc(doc(db, IMAGES, id), data, { merge: true });
}

export async function deleteImage(id: string): Promise<void> {
  const db = await dbOrNull();
  if (!db) return;
  await deleteDoc(doc(db, IMAGES, id));
}

export async function saveDrawing(path: DrawingPath): Promise<void> {
  const db = await dbOrNull();
  if (!db) return;
  const { id, ...data } = path;
  await setDoc(doc(db, DRAWINGS, id), data, { merge: true });
}

export async function deleteDrawing(id: string): Promise<void> {
  const db = await dbOrNull();
  if (!db) return;
  await deleteDoc(doc(db, DRAWINGS, id));
}
