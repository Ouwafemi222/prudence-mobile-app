-- Block re-uploading the same proof image file (exact SHA-256 per user)

CREATE TABLE IF NOT EXISTS public.proof_image_hashes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  office_id uuid NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
  content_hash text NOT NULL,
  storage_path text NOT NULL,
  proof_type text NOT NULL,
  activity_id uuid REFERENCES public.daily_activities(id) ON DELETE SET NULL,
  activity_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT proof_image_hashes_user_hash_unique UNIQUE (user_id, content_hash)
);

CREATE INDEX IF NOT EXISTS proof_image_hashes_user_idx ON public.proof_image_hashes (user_id);
CREATE INDEX IF NOT EXISTS proof_image_hashes_office_idx ON public.proof_image_hashes (office_id);

ALTER TABLE public.proof_image_hashes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own proof hashes"
  ON public.proof_image_hashes FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own proof hashes"
  ON public.proof_image_hashes FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.user_can_access_office(office_id)
  );

CREATE POLICY "Admins can view office proof hashes"
  ON public.proof_image_hashes FOR SELECT TO authenticated
  USING (
    public.user_can_access_office(office_id)
    AND (
      public.is_admin(auth.uid())
      OR public.user_is_office_admin(auth.uid(), office_id)
    )
  );

CREATE OR REPLACE FUNCTION public.check_proof_image_hash(p_content_hash text)
RETURNS TABLE(
  is_duplicate boolean,
  activity_date date,
  proof_type text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    true AS is_duplicate,
    h.activity_date,
    h.proof_type
  FROM public.proof_image_hashes h
  WHERE h.user_id = auth.uid()
    AND h.content_hash = lower(trim(p_content_hash))
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.check_proof_image_hash(text) TO authenticated;
