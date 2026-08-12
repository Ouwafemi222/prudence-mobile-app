import { supabase } from "../integrations/supabase/client";
import { getLocalUriAsUploadBody } from "./localFileForUpload";
import {
  computeDHash,
  findPerceptualDuplicate,
  PERCEPTUAL_BLOCK_ENABLED,
  PERCEPTUAL_HASH_MAX_DISTANCE,
} from "./proofImagePerceptualHash";

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    const digest = await subtle.digest("SHA-256", bytes.buffer as ArrayBuffer);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  try {
    const Crypto = require("expo-crypto") as typeof import("expo-crypto");
    if (typeof Crypto.digest === "function") {
      const digest = await Crypto.digest(
        Crypto.CryptoDigestAlgorithm.SHA256,
        bytes.buffer as ArrayBuffer,
      );
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    }
  } catch {
    // fall through
  }

  throw new Error("SHA-256 is not available on this device.");
}

/** Hash a local image URI (camera/gallery) with SHA-256 of file bytes. */
export async function hashFileSha256(uri: string): Promise<string> {
  const { body } = await getLocalUriAsUploadBody(uri);
  const bytes =
    body instanceof ArrayBuffer
      ? new Uint8Array(body)
      : new Uint8Array(await (body as Blob).arrayBuffer());
  return sha256Hex(bytes);
}

export type DuplicateProofCheck = {
  isDuplicate: boolean;
  activityDate?: string;
  proofType?: string;
};

export type ProofHashRow = {
  contentHash: string;
  perceptualHash: string | null;
  activityDate: string;
  proofType: string;
  activityId: string | null;
  storagePath: string;
};

export type PerceptualDuplicateCheck = {
  isDuplicate: boolean;
  activityDate?: string;
  proofType?: string;
  distance?: number;
  shadowOnly?: boolean;
};

export async function fetchUserProofHashes(): Promise<ProofHashRow[]> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return [];

  const { data, error } = await supabase
    .from("proof_image_hashes")
    .select("content_hash, perceptual_hash, activity_date, proof_type, activity_id, storage_path")
    .eq("user_id", userId);

  if (error) {
    console.error("fetchUserProofHashes:", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    contentHash: row.content_hash,
    perceptualHash: row.perceptual_hash,
    activityDate: row.activity_date,
    proofType: row.proof_type,
    activityId: row.activity_id,
    storagePath: row.storage_path,
  }));
}

export async function checkDuplicateProofImage(contentHash: string): Promise<DuplicateProofCheck> {
  const { data, error } = await supabase.rpc("check_proof_image_hash", {
    p_content_hash: contentHash,
  });

  if (error) {
    console.error("check_proof_image_hash:", error);
    return { isDuplicate: false };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.is_duplicate) return { isDuplicate: false };

  return {
    isDuplicate: true,
    activityDate: row.activity_date as string | undefined,
    proofType: row.proof_type as string | undefined,
  };
}

export async function checkPerceptualProofImage(
  perceptualHash: string | null,
  userHashes: ProofHashRow[],
  pendingHashes: Array<{ perceptualHash: string | null; proofType: string }>,
  options: { excludeActivityId?: string | null } = {},
): Promise<PerceptualDuplicateCheck> {
  if (!perceptualHash) {
    return { isDuplicate: false };
  }

  const candidates = [
    ...userHashes.map((row) => ({
      perceptualHash: row.perceptualHash,
      activityDate: row.activityDate,
      proofType: row.proofType,
      activityId: row.activityId,
    })),
    ...pendingHashes
      .filter((p) => p.perceptualHash)
      .map((p) => ({
        perceptualHash: p.perceptualHash,
        activityDate: "this session",
        proofType: p.proofType,
        activityId: null as string | null,
      })),
  ];

  const match = findPerceptualDuplicate(perceptualHash, candidates, {
    excludeActivityId: options.excludeActivityId,
    maxDistance: PERCEPTUAL_HASH_MAX_DISTANCE,
  });

  if (!match) {
    return { isDuplicate: false };
  }

  const shouldBlock = PERCEPTUAL_BLOCK_ENABLED;
  if (!shouldBlock) {
    console.info("[perceptual dedup shadow]", {
      distance: match.distance,
      activityDate: match.activityDate,
      proofType: match.proofType,
    });
  }

  return {
    isDuplicate: shouldBlock,
    activityDate: match.activityDate,
    proofType: match.proofType,
    distance: match.distance,
    shadowOnly: !shouldBlock,
  };
}

export async function recordProofImageHash(options: {
  contentHash: string;
  perceptualHash?: string | null;
  storagePath: string;
  proofType: string;
  activityDate: string;
  officeId: string;
  activityId?: string | null;
}): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return;

  const { error } = await supabase.from("proof_image_hashes").insert({
    user_id: userId,
    office_id: options.officeId,
    content_hash: options.contentHash,
    perceptual_hash: options.perceptualHash ?? null,
    hash_algorithm: "dhash",
    storage_path: options.storagePath,
    proof_type: options.proofType,
    activity_date: options.activityDate,
    activity_id: options.activityId ?? null,
  });

  if (error && !error.message.includes("duplicate") && !error.code?.includes("23505")) {
    console.error("recordProofImageHash:", error);
  }
}

export { computeDHash, PERCEPTUAL_BLOCK_ENABLED };
