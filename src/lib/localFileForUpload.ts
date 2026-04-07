import * as FileSystem from "expo-file-system/legacy";

/** React Native `fetch(file://)` often fails on Android with "Network request failed". Read via FileSystem + base64 instead. */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const atobFn = globalThis.atob;
  if (typeof atobFn !== "function") {
    throw new Error("Base64 decode not available");
  }
  const binaryString = atobFn(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i += 1) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function guessContentType(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.includes(".png")) return "image/png";
  if (lower.includes(".webp")) return "image/webp";
  if (lower.includes(".heic")) return "image/heic";
  return "image/jpeg";
}

/**
 * Returns body + content type for Supabase storage.upload().
 * Tries fetch(uri).blob() first; falls back to base64 read (reliable for gallery/camera URIs on Android).
 */
export async function getLocalUriAsUploadBody(uri: string): Promise<{ body: Blob | ArrayBuffer; contentType: string }> {
  const fallbackType = guessContentType(uri);

  try {
    const res = await fetch(uri);
    if (res.ok) {
      const blob = await res.blob();
      if (blob.size > 0) {
        return { body: blob, contentType: blob.type || fallbackType };
      }
    }
  } catch {
    // use FileSystem path
  }

  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: "base64",
  });
  const buffer = base64ToArrayBuffer(base64);
  return { body: buffer, contentType: fallbackType };
}
