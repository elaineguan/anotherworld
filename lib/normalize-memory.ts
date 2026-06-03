import type { NoteMemory, ImageMemory, DrawingPath } from "@/types";

export function toMillis(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (
    value &&
    typeof value === "object" &&
    "toMillis" in value &&
    typeof (value as { toMillis: () => number }).toMillis === "function"
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }
  return 0;
}

export function normalizeNoteMemory(
  raw: Record<string, unknown>
): NoteMemory | null {
  if (typeof raw.id !== "string") return null;
  if (typeof raw.content !== "string") return null;
  if (typeof raw.x !== "number" || typeof raw.y !== "number") return null;
  if (typeof raw.width !== "number" || typeof raw.height !== "number") {
    return null;
  }

  const now = Date.now();
  return {
    id: raw.id,
    content: raw.content,
    x: raw.x,
    y: raw.y,
    width: raw.width,
    height: raw.height,
    createdAt: toMillis(raw.createdAt) || now,
    updatedAt: toMillis(raw.updatedAt) || now,
  };
}

export function normalizeImageMemory(
  raw: Record<string, unknown>
): ImageMemory | null {
  if (typeof raw.id !== "string") return null;
  if (typeof raw.storageUrl !== "string" || raw.storageUrl.length === 0) {
    return null;
  }
  if (typeof raw.x !== "number" || typeof raw.y !== "number") return null;
  if (typeof raw.width !== "number" || typeof raw.height !== "number") {
    return null;
  }

  const now = Date.now();
  return {
    id: raw.id,
    caption: typeof raw.caption === "string" ? raw.caption : "",
    x: raw.x,
    y: raw.y,
    width: raw.width,
    height: raw.height,
    storageUrl: raw.storageUrl,
    createdAt: toMillis(raw.createdAt) || now,
    updatedAt: toMillis(raw.updatedAt) || now,
  };
}

export function normalizeDrawingPath(
  raw: Record<string, unknown>
): DrawingPath | null {
  if (typeof raw.id !== "string") return null;
  if (!Array.isArray(raw.points)) return null;

  const points = raw.points
    .map((point) => {
      if (!point || typeof point !== "object") return null;
      const p = point as Record<string, unknown>;
      if (typeof p.x !== "number" || typeof p.y !== "number") return null;
      return { x: p.x, y: p.y };
    })
    .filter((p): p is { x: number; y: number } => p !== null);

  if (points.length === 0) return null;

  return {
    id: raw.id,
    points,
    color: typeof raw.color === "string" ? raw.color : "#5A5A5A",
    strokeWidth:
      typeof raw.strokeWidth === "number" ? raw.strokeWidth : 2,
    createdAt: toMillis(raw.createdAt) || Date.now(),
  };
}
