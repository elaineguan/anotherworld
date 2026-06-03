import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { compressImageForUpload } from "./compress-image";
import { ensureFirebaseInitialized, getFirebaseStorage } from "./firebase";

export async function uploadMemoryImage(file: File): Promise<string | null> {
  if (!(await ensureFirebaseInitialized())) return null;
  const storage = getFirebaseStorage();
  if (!storage) return null;

  try {
    const compressed = await compressImageForUpload(file);
    const path = `memories/${Date.now()}-${file.name.replace(/\s+/g, "-")}.jpg`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, compressed, {
      contentType: compressed.type || "image/jpeg",
    });
    return getDownloadURL(storageRef);
  } catch (error) {
    console.error("Firebase Storage upload failed:", error);
    return null;
  }
}
