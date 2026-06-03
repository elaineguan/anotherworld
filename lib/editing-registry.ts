import type { ImageMemory, NoteMemory } from "@/types";

const editingNoteIds = new Set<string>();
const editingImageIds = new Set<string>();

export function setNoteEditing(noteId: string, editing: boolean): void {
  if (editing) editingNoteIds.add(noteId);
  else editingNoteIds.delete(noteId);
}

export function setImageEditing(imageId: string, editing: boolean): void {
  if (editing) editingImageIds.add(imageId);
  else editingImageIds.delete(imageId);
}

export function isNoteEditing(noteId: string): boolean {
  return editingNoteIds.has(noteId);
}

export function isImageEditing(imageId: string): boolean {
  return editingImageIds.has(imageId);
}

export function applyEditingNoteOverrides(
  merged: NoteMemory[],
  local: NoteMemory[]
): NoteMemory[] {
  if (editingNoteIds.size === 0) return merged;

  const result = [...merged];
  for (const id of editingNoteIds) {
    const localNote = local.find((n) => n.id === id);
    if (!localNote) continue;
    const idx = result.findIndex((n) => n.id === id);
    if (idx >= 0) result[idx] = localNote;
    else result.push(localNote);
  }
  return result;
}

export function applyEditingImageOverrides(
  merged: ImageMemory[],
  local: ImageMemory[]
): ImageMemory[] {
  if (editingImageIds.size === 0) return merged;

  const result = [...merged];
  for (const id of editingImageIds) {
    const localImage = local.find((i) => i.id === id);
    if (!localImage) continue;
    const idx = result.findIndex((i) => i.id === id);
    if (idx >= 0) result[idx] = localImage;
    else result.push(localImage);
  }
  return result;
}
