import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirebaseStorage } from "./firebase";

export async function uploadMemoryImage(file: File): Promise<string | null> {
  const storage = getFirebaseStorage();
  if (!storage) return null;

  const path = `memories/${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}
