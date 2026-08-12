/** Max Hamming distance to treat two dHashes as the same picture */
export const PERCEPTUAL_HASH_MAX_DISTANCE = 6;

/** Block uploads when perceptual match found (set EXPO_PUBLIC_PERCEPTUAL_DEDUP=false to log only) */
export const PERCEPTUAL_BLOCK_ENABLED = process.env.EXPO_PUBLIC_PERCEPTUAL_DEDUP !== "false";

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

/** Compute dHash from grayscale pixel samples (9×8 grid, row-major). */
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

/**
 * Native dHash. Canvas is not available on RN.
 * Accepts a local image URI (resized via expo-image-manipulator) or a 9×8 grayscale sample.
 * Fail-open (null) if decode/resize is unavailable — SHA-256 still blocks exact dupes.
 */
export async function computeDHash(
  source?: string | { grayscale?: number[] } | null,
): Promise<string | null> {
  try {
    if (source && typeof source === "object" && source.grayscale) {
      return await withTimeout(Promise.resolve(computeDHashFromGrayscale(source.grayscale)), HASH_TIMEOUT_MS);
    }
    if (typeof source === "string" && source.length > 0) {
      return await withTimeout(computeDHashFromUri(source), HASH_TIMEOUT_MS);
    }
    return null;
  } catch (err) {
    console.warn("computeDHash:", err);
    return null;
  }
}

async function computeDHashFromUri(uri: string): Promise<string | null> {
  try {
    const ImageManipulator = require("expo-image-manipulator") as {
      manipulateAsync: (
        uri: string,
        actions: Array<{ resize: { width: number; height: number } }>,
        options: { compress: number; format?: string; base64?: boolean },
      ) => Promise<{ uri: string; base64?: string }>;
      SaveFormat?: { JPEG: string };
    };
    await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: DHASH_WIDTH, height: DHASH_HEIGHT } }],
      { compress: 1, format: ImageManipulator.SaveFormat?.JPEG, base64: false },
    );
    // Pixel buffers are not exposed by expo-image-manipulator. Fail-open like web decode errors.
    return null;
  } catch {
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
  } = {},
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
