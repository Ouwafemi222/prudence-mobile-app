-- Perceptual hash (dHash) for similar-image detection alongside exact SHA-256

ALTER TABLE public.proof_image_hashes
  ADD COLUMN IF NOT EXISTS perceptual_hash text,
  ADD COLUMN IF NOT EXISTS hash_algorithm text NOT NULL DEFAULT 'dhash';

CREATE INDEX IF NOT EXISTS proof_image_hashes_user_perceptual_idx
  ON public.proof_image_hashes (user_id)
  WHERE perceptual_hash IS NOT NULL;

COMMENT ON COLUMN public.proof_image_hashes.perceptual_hash IS
  '64-bit dHash as 16-char hex; used for similar-image duplicate detection';
COMMENT ON COLUMN public.proof_image_hashes.hash_algorithm IS
  'Perceptual hash algorithm (default dhash)';
