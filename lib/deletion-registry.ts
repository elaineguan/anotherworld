/** IDs deleted this session — never resurrect from sync or autosave. */
const tombstonedNoteIds = new Set<string>();
const tombstonedImageIds = new Set<string>();
const tombstonedDrawingIds = new Set<string>();

/** IDs waiting for Firestore delete confirmation — filter from remote merges. */
const pendingDeletedNoteIds = new Set<string>();
const pendingDeletedImageIds = new Set<string>();
const pendingDeletedDrawingIds = new Set<string>();

export function isNoteDeleted(id: string): boolean {
  return tombstonedNoteIds.has(id) || pendingDeletedNoteIds.has(id);
}

export function isImageDeleted(id: string): boolean {
  return tombstonedImageIds.has(id) || pendingDeletedImageIds.has(id);
}

export function isDrawingDeleted(id: string): boolean {
  return tombstonedDrawingIds.has(id) || pendingDeletedDrawingIds.has(id);
}

export function markNoteDeleted(id: string): void {
  tombstonedNoteIds.add(id);
  pendingDeletedNoteIds.add(id);
}

export function markImageDeleted(id: string): void {
  tombstonedImageIds.add(id);
  pendingDeletedImageIds.add(id);
}

export function markDrawingDeleted(id: string): void {
  tombstonedDrawingIds.add(id);
  pendingDeletedDrawingIds.add(id);
}

export function clearNoteDeletion(id: string): void {
  tombstonedNoteIds.delete(id);
  pendingDeletedNoteIds.delete(id);
}

export function clearImageDeletion(id: string): void {
  tombstonedImageIds.delete(id);
  pendingDeletedImageIds.delete(id);
}

export function clearDrawingDeletion(id: string): void {
  tombstonedDrawingIds.delete(id);
  pendingDeletedDrawingIds.delete(id);
}

export function confirmNoteDeletedInRemote(id: string): void {
  pendingDeletedNoteIds.delete(id);
}

export function confirmImageDeletedInRemote(id: string): void {
  pendingDeletedImageIds.delete(id);
}

export function confirmDrawingDeletedInRemote(id: string): void {
  pendingDeletedDrawingIds.delete(id);
}

export function getPendingDeletedNoteIds(): ReadonlySet<string> {
  return pendingDeletedNoteIds;
}

export function getPendingDeletedImageIds(): ReadonlySet<string> {
  return pendingDeletedImageIds;
}

export function getPendingDeletedDrawingIds(): ReadonlySet<string> {
  return pendingDeletedDrawingIds;
}

export function getTombstonedNoteIds(): ReadonlySet<string> {
  return tombstonedNoteIds;
}

export function getTombstonedImageIds(): ReadonlySet<string> {
  return tombstonedImageIds;
}

export function getTombstonedDrawingIds(): ReadonlySet<string> {
  return tombstonedDrawingIds;
}

export function confirmPendingNoteDeletesInRemote(
  remote: { id: string }[]
): void {
  for (const id of pendingDeletedNoteIds) {
    if (!remote.some((item) => item.id === id)) {
      pendingDeletedNoteIds.delete(id);
    }
  }
}

export function confirmPendingImageDeletesInRemote(
  remote: { id: string }[]
): void {
  for (const id of pendingDeletedImageIds) {
    if (!remote.some((item) => item.id === id)) {
      pendingDeletedImageIds.delete(id);
    }
  }
}

export function confirmPendingDrawingDeletesInRemote(
  remote: { id: string }[]
): void {
  for (const id of pendingDeletedDrawingIds) {
    if (!remote.some((item) => item.id === id)) {
      pendingDeletedDrawingIds.delete(id);
    }
  }
}

export function withoutDeletedNotes<T extends { id: string }>(items: T[]): T[] {
  return items.filter((item) => !isNoteDeleted(item.id));
}

export function withoutDeletedImages<T extends { id: string }>(items: T[]): T[] {
  return items.filter((item) => !isImageDeleted(item.id));
}

export function withoutDeletedDrawings<T extends { id: string }>(items: T[]): T[] {
  return items.filter((item) => !isDrawingDeleted(item.id));
}

export function withoutPendingNoteDeletes<T extends { id: string }>(
  items: T[]
): T[] {
  return items.filter((item) => !pendingDeletedNoteIds.has(item.id));
}

export function withoutPendingImageDeletes<T extends { id: string }>(
  items: T[]
): T[] {
  return items.filter((item) => !pendingDeletedImageIds.has(item.id));
}

export function withoutPendingDrawingDeletes<T extends { id: string }>(
  items: T[]
): T[] {
  return items.filter((item) => !pendingDeletedDrawingIds.has(item.id));
}
