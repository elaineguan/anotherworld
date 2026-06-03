import type { NoteMemory, ImageMemory, DrawingPath } from "@/types";

const NOTES_KEY = "isekai-notes";
const IMAGES_KEY = "isekai-images";
const DRAWINGS_KEY = "isekai-drawings";

function parseJson(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function isNoteMemory(value: unknown): value is NoteMemory {
  if (!value || typeof value !== "object") return false;
  const note = value as Record<string, unknown>;
  return (
    typeof note.id === "string" &&
    typeof note.content === "string" &&
    typeof note.x === "number" &&
    typeof note.y === "number" &&
    typeof note.width === "number" &&
    typeof note.height === "number"
  );
}

function isImageMemory(value: unknown): value is ImageMemory {
  if (!value || typeof value !== "object") return false;
  const image = value as Record<string, unknown>;
  return (
    typeof image.id === "string" &&
    typeof image.storageUrl === "string" &&
    image.storageUrl.length > 0 &&
    typeof image.caption === "string" &&
    typeof image.x === "number" &&
    typeof image.y === "number" &&
    typeof image.width === "number" &&
    typeof image.height === "number"
  );
}

function normalizeImageMemory(raw: Record<string, unknown>): ImageMemory | null {
  if (!isImageMemory(raw)) return null;
  return {
    id: raw.id as string,
    caption: (raw.caption as string) ?? "",
    x: raw.x as number,
    y: raw.y as number,
    width: raw.width as number,
    height: raw.height as number,
    storageUrl: raw.storageUrl as string,
    createdAt: typeof raw.createdAt === "number" ? raw.createdAt : Date.now(),
    updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : Date.now(),
  };
}

function normalizeNoteMemory(raw: Record<string, unknown>): NoteMemory | null {
  if (!isNoteMemory(raw)) return null;
  return {
    id: raw.id as string,
    content: raw.content as string,
    x: raw.x as number,
    y: raw.y as number,
    width: raw.width as number,
    height: raw.height as number,
    createdAt: typeof raw.createdAt === "number" ? raw.createdAt : Date.now(),
    updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : Date.now(),
  };
}

function isDrawingPath(value: unknown): value is DrawingPath {
  if (!value || typeof value !== "object") return false;
  const path = value as Record<string, unknown>;
  return (
    typeof path.id === "string" &&
    Array.isArray(path.points) &&
    path.points.every(
      (point) =>
        point &&
        typeof point === "object" &&
        typeof (point as Record<string, unknown>).x === "number" &&
        typeof (point as Record<string, unknown>).y === "number"
    )
  );
}

export function loadLocalNotes(): NoteMemory[] {
  if (typeof window === "undefined") return [];
  const parsed = parseJson(localStorage.getItem(NOTES_KEY));
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((item) =>
      item && typeof item === "object"
        ? normalizeNoteMemory(item as Record<string, unknown>)
        : null
    )
    .filter((note): note is NoteMemory => note !== null);
}

export function saveLocalNotes(notes: NoteMemory[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}

export function loadLocalImages(): ImageMemory[] {
  if (typeof window === "undefined") return [];
  const parsed = parseJson(localStorage.getItem(IMAGES_KEY));
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const raw = item as Record<string, unknown>;
      if (typeof raw.caption !== "string") raw.caption = "";
      return normalizeImageMemory(raw);
    })
    .filter((image): image is ImageMemory => image !== null);
}

export function saveLocalImages(images: ImageMemory[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(IMAGES_KEY, JSON.stringify(images));
}

export function loadLocalDrawings(): DrawingPath[] {
  if (typeof window === "undefined") return [];
  const parsed = parseJson(localStorage.getItem(DRAWINGS_KEY));
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(isDrawingPath);
}

export function saveLocalDrawings(paths: DrawingPath[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DRAWINGS_KEY, JSON.stringify(paths));
}
