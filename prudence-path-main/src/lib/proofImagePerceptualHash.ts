/** Max Hamming distance to treat two dHashes as the same picture */
export const PERCEPTUAL_HASH_MAX_DISTANCE = 6;

/** Block uploads when perceptual match found (set VITE_PERCEPTUAL_DEDUP=false to log only) */
export const PERCEPTUAL_BLOCK_ENABLED =
  import.meta.env.VITE_PERCEPTUAL_DEDUP !== "false";

const HASH_TIMEOUT_MS = 5000;
const DHASH_WIDTH = 9;
const DHASH_HEIGHT = 8;

export function hammingDistance(a: string, b: string): number {
  if (a.length !== b.length || a.length === 0) return Number.POSITIVE_INFINITY;
  try {
    const ai = BigInt(`0x${a}`);
    const bi = BigInt(`0x${b}`);
    let xor = ai ^ bi;
    let count = 0;
    while (xor > 0n) {
      count += Number(xor & 1n);
      xor >>= 1n;
    }
    return count;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

export function binaryToHex64(bits: string): string {
  let hex = "";
  for (let i = 0; i < 64; i += 4) {
    hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  }
  return hex;
}

/** Compute dHash from grayscale pixel samples (9×8 grid, row-major). For unit tests. */
export function computeDHashFromGrayscale(gray: number[]): string | null {
  if (gray.length !== DHASH_WIDTH * DHASH_HEIGHT) return null;
  let bits = "";
  for (let y = 0; y < DHASH_HEIGHT; y++) {
    for (let x = 0; x < DHASH_WIDTH - 1; x++) {
      const left = gray[y * DHASH_WIDTH + x];
      const right = gray[y * DHASH_WIDTH + x + 1];
      bits += left < right ? "1" : "0";
    }
  }
  return binaryToHex64(bits);
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

async function loadImageBitmap(file: File): Promise<ImageBitmap | null> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      // fall through to Image element
    }
  }

  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      createImageBitmap(img)
        .then(resolve)
        .catch(() => resolve(null));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

async function computeDHashInternal(file: File): Promise<string | null> {
  const bitmap = await loadImageBitmap(file);
  if (!bitmap) return null;

  const canvas = document.createElement("canvas");
  canvas.width = DHASH_WIDTH;
  canvas.height = DHASH_HEIGHT;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    bitmap.close?.();
    return null;
  }

  ctx.drawImage(bitmap, 0, 0, DHASH_WIDTH, DHASH_HEIGHT);
  bitmap.close?.();

  const { data } = ctx.getImageData(0, 0, DHASH_WIDTH, DHASH_HEIGHT);
  const gray: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    gray.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
  }

  return computeDHashFromGrayscale(gray);
}

/** Browser dHash via Canvas. Returns null on failure (fail-open). */
export async function computeDHash(file: File): Promise<string | null> {
  if (typeof document === "undefined") return null;
  try {
    const result = await withTimeout(computeDHashInternal(file), HASH_TIMEOUT_MS);
    if (result === null) {
      console.warn("computeDHash: timed out or failed");
    }
    return result;
  } catch (err) {
    console.warn("computeDHash:", err);
    return null;
  }
}

export type PerceptualMatch = {
  activityDate: string;
  proofType: string;
  distance: number;
};

export function findPerceptualDuplicate(
  perceptualHash: string,
  candidates: Array<{
    perceptualHash: string | null;
    activityDate: string;
    proofType: string;
    activityId?: string | null;
  }>,
  options: {
    excludeActivityId?: string | null;
    maxDistance?: number;
  } = {}
): PerceptualMatch | null {
  const maxDistance = options.maxDistance ?? PERCEPTUAL_HASH_MAX_DISTANCE;
  let best: PerceptualMatch | null = null;

  for (const row of candidates) {
    if (!row.perceptualHash) continue;
    if (options.excludeActivityId && row.activityId === options.excludeActivityId) continue;

    const distance = hammingDistance(perceptualHash, row.perceptualHash);
    if (distance <= maxDistance && (!best || distance < best.distance)) {
      best = {
        activityDate: row.activityDate,
        proofType: row.proofType,
        distance,
      };
    }
  }

  return best;
}
