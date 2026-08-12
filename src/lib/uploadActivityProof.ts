import { supabase } from "../integrations/supabase/client";
import { getLocalUriAsUploadBody } from "./localFileForUpload";
import {
  checkDuplicateProofImage,
  checkPerceptualProofImage,
  fetchUserProofHashes,
  hashFileSha256,
  recordProofImageHash,
  type ProofHashRow,
} from "./proofImageHash";
import { computeDHash } from "./proofImagePerceptualHash";

type UploadProofsOptions = {
  uris: string[];
  userId: string;
  officeId: string | null;
  proofType: string;
  activityDate: string;
  activityId: string | null;
};

export async function uploadActivityProofs({
  uris,
  userId,
  officeId,
  proofType,
  activityDate,
  activityId,
}: UploadProofsOptions): Promise<string[]> {
  if (uris.length === 0) return [];

  const userHashes: ProofHashRow[] = officeId ? await fetchUserProofHashes() : [];
  const pending: Array<{ perceptualHash: string | null; proofType: string }> = [];
  const uploadedPaths: string[] = [];

  for (const uri of uris) {
    const contentHash = await hashFileSha256(uri);
    const exact = await checkDuplicateProofImage(contentHash);
    if (exact.isDuplicate) {
      throw new Error(`This ${proofType} proof was already used on ${exact.activityDate ?? "another day"}.`);
    }

    const perceptualHash = await computeDHash(uri);
    const perceptual = await checkPerceptualProofImage(perceptualHash, userHashes, pending, {
      excludeActivityId: activityId,
    });
    if (perceptual.isDuplicate) {
      throw new Error(
        `This ${proofType} proof looks like one already used on ${perceptual.activityDate ?? "another day"}.`,
      );
    }

    const { body, contentType } = await getLocalUriAsUploadBody(uri);
    const ext = uri.match(/\.(\w+)(\?|$)/)?.[1] ?? "jpg";
    const filePath = `${userId}/${proofType}_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, body, {
      contentType,
      upsert: false,
    });
    if (uploadError) throw uploadError;

    if (officeId) {
      await recordProofImageHash({
        contentHash,
        perceptualHash,
        storagePath: filePath,
        proofType,
        activityDate,
        officeId,
        activityId,
      });
    }

    pending.push({ perceptualHash, proofType });
    uploadedPaths.push(filePath);
  }

  return uploadedPaths;
}
