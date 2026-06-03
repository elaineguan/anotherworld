import type { NoteMemory, ImageMemory, DrawingPath } from "@/types";
import { toMillis } from "@/lib/normalize-memory";

function updatedAtMs(item: { updatedAt: number }): number {
  return toMillis(item.updatedAt);
}

function mergeByUpdatedAt<T extends { id: string; updatedAt: number }>(
  remote: T[],
  local: T[]
): T[] {
  const map = new Map<string, T>();

  for (const item of remote) {
    map.set(item.id, item);
  }

  for (const item of local) {
    const existing = map.get(item.id);
    if (!existing || updatedAtMs(item) >= updatedAtMs(existing)) {
      map.set(item.id, item);
    }
  }

  const merged = Array.from(map.values());

  for (const item of local) {
    if (!merged.some((m) => m.id === item.id)) {
      merged.push(item);
    }
  }

  return merged;
}

export function mergeNotes(
  remote: NoteMemory[],
  local: NoteMemory[]
): NoteMemory[] {
  return mergeByUpdatedAt(remote, local);
}

export function mergeImages(
  remote: ImageMemory[],
  local: ImageMemory[]
): ImageMemory[] {
  return mergeByUpdatedAt(remote, local);
}

export function mergeDrawings(
  remote: DrawingPath[],
  local: DrawingPath[]
): DrawingPath[] {
  const map = new Map<string, DrawingPath>();

  for (const path of remote) {
    map.set(path.id, path);
  }

  for (const path of local) {
    if (!map.has(path.id)) {
      map.set(path.id, path);
    }
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
    return !remoteItem || updatedAtMs(item) > updatedAtMs(remoteItem);
  });
}
