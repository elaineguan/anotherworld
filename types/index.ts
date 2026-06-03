export type AppPhase = "loading" | "intro" | "canvas";

export type CanvasTool = "select" | "note" | "image" | "draw" | "erase";

export interface Point {
  x: number;
  y: number;
}

export interface DrawingPath {
  id: string;
  points: Point[];
  color: string;
  strokeWidth: number;
  createdAt: number;
}

export interface NoteMemory {
  id: string;
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  createdAt: number;
  updatedAt: number;
}

export interface ImageMemory {
  id: string;
  caption: string;
  x: number;
  y: number;
  width: number;
  height: number;
  storageUrl: string;
  createdAt: number;
  updatedAt: number;
}

export type MemoryNodeType = "note" | "image";

export interface MemoryNodeData extends Record<string, unknown> {
  memoryType: MemoryNodeType;
  noteId?: string;
  imageId?: string;
  /** @deprecated Flow nodes use noteId; kept for migration */
  note?: NoteMemory;
  /** @deprecated Flow nodes use imageId; kept for migration */
  image?: ImageMemory;
}
