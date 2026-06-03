import type { ImageMemory } from "@/types";

/** Firestore documents must stay under ~1MB; embedded photos exceed that quickly. */
const MAX_FIRESTORE_URL_LENGTH = 500_000;

export function isEmbeddedImageUrl(url: string): boolean {
  return url.startsWith("data:");
}

export function canSyncImageToFirestore(image: ImageMemory): boolean {
  const url = image.storageUrl ?? "";
  if (!url) return false;
  if (isEmbeddedImageUrl(url)) return false;
  return url.length < MAX_FIRESTORE_URL_LENGTH;
}

export function imageSyncBlockedReason(image: ImageMemory): string | null {
  const url = image.storageUrl ?? "";
  if (!url) return "missing image URL";
  if (isEmbeddedImageUrl(url)) {
    return "re-add this memento so it uploads to Storage (old embed too large for cloud)";
  }
  if (url.length >= MAX_FIRESTORE_URL_LENGTH) {
    return "image URL too large for cloud sync";
  }
  return null;
}
