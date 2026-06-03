import type { NoteMemory, ImageMemory, DrawingPath } from "@/types";
import { toMillis } from "@/lib/normalize-memory";

function mergeByUpdatedAt<T extends { id: string; updatedAt: number }>(
  remote: T[],
  local: T[],
  isDeleted: (id: string) => boolean
): T[] {
  const map = new Map<string, T>();

  for (const item of remote) {
    if (isDeleted(item.id)) continue;
    map.set(item.id, item);
  }

  for (const item of local) {
    if (isDeleted(item.id)) continue;
    const existing = map.get(item.id);
    if (!existing || toMillis(item.updatedAt) >= toMillis(existing.updatedAt)) {
      map.set(item.id, item);
    }
  }

  return Array.from(map.values());
}

export function mergeNotes(
  remote: NoteMemory[],
  local: NoteMemory[],
  isDeleted: (id: string) => boolean = () => false
): NoteMemory[] {
  return mergeByUpdatedAt(remote, local, isDeleted);
}

export function mergeImages(
  remote: ImageMemory[],
  local: ImageMemory[],
  isDeleted: (id: string) => boolean = () => false
): ImageMemory[] {
  return mergeByUpdatedAt(remote, local, isDeleted);
}

export function mergeDrawings(
  remote: DrawingPath[],
  local: DrawingPath[],
  isDeleted: (id: string) => boolean = () => false
): DrawingPath[] {
  const map = new Map<string, DrawingPath>();

  for (const path of remote) {
    if (isDeleted(path.id)) continue;
    map.set(path.id, path);
  }

  for (const path of local) {
    if (isDeleted(path.id)) continue;
    map.set(path.id, path);
  }

  return Array.from(map.values());
}

export function itemsMissingFromRemote<T extends { id: string }>(
  merged: T[],
  remote: T[]
): T[] {
  const remoteIds = new Set(remote.map((item) => item.id));
  return merged.filter((item) => !remoteIds.has(item.id));
}

export function itemsNewerThanRemote<
  T extends { id: string; updatedAt: number },
>(merged: T[], remote: T[]): T[] {
  const remoteById = new Map(remote.map((item) => [item.id, item]));
  return merged.filter((item) => {
    const remoteItem = remoteById.get(item.id);
    return !remoteItem || toMillis(item.updatedAt) > toMillis(remoteItem.updatedAt);
  });
}
