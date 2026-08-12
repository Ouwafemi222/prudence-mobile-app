-- Cancelled orders tracking (income)
ALTER TABLE public.daily_activities
  ADD COLUMN IF NOT EXISTS cancelled_orders_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cancelled_order_amount_received numeric DEFAULT 0;

-- Section-based verification
CREATE TABLE IF NOT EXISTS public.activity_section_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES public.daily_activities(id) ON DELETE CASCADE,
  section text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  feedback text,
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(activity_id, section)
);

ALTER TABLE public.activity_section_verifications ENABLE ROW LEVEL SECURITY;

-- updated_at trigger
DROP TRIGGER IF EXISTS update_activity_section_verifications_updated_at ON public.activity_section_verifications;
CREATE TRIGGER update_activity_section_verifications_updated_at
  BEFORE UPDATE ON public.activity_section_verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Ensure default section rows exist when a daily activity is created
CREATE OR REPLACE FUNCTION public.ensure_activity_section_verifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sections text[] := ARRAY['reading','gigs','accounts','income','prospecting','skills','other','training'];
  s text;
BEGIN
  FOREACH s IN ARRAY sections LOOP
    INSERT INTO public.activity_section_verifications(activity_id, section, status)
    VALUES (NEW.id, s, 'pending')
    ON CONFLICT (activity_id, section) DO NOTHING;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_activity_section_verifications_trigger ON public.daily_activities;
CREATE TRIGGER ensure_activity_section_verifications_trigger
AFTER INSERT ON public.daily_activities
FOR EACH ROW
EXECUTE FUNCTION public.ensure_activity_section_verifications();

-- Sync overall verification fields from section statuses
CREATE OR REPLACE FUNCTION public.sync_activity_verification_from_sections()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_activity_id uuid;
  v_any_rejected boolean;
  v_all_approved boolean;
  v_any_rows boolean;
BEGIN
  v_activity_id := COALESCE(NEW.activity_id, OLD.activity_id);

  SELECT
    (COUNT(*) > 0),
    COALESCE(BOOL_OR(status = 'rejected'), false),
    COALESCE(BOOL_AND(status = 'approved'), false)
  INTO v_any_rows, v_any_rejected, v_all_approved
  FROM public.activity_section_verifications
  WHERE activity_id = v_activity_id;

  IF NOT v_any_rows THEN
    -- No sections: treat as pending
    UPDATE public.daily_activities
    SET is_verified = false,
        verified_at = NULL,
        verified_by = NULL
    WHERE id = v_activity_id;
    RETURN NULL;
  END IF;

  IF v_any_rejected THEN
    UPDATE public.daily_activities
    SET is_verified = false,
        verified_at = now(),
        verified_by = auth.uid(),
        verification_feedback = COALESCE(verification_feedback, 'See section feedback')
    WHERE id = v_activity_id;
  ELSIF v_all_approved THEN
    UPDATE public.daily_activities
    SET is_verified = true,
        verified_at = now(),
        verified_by = auth.uid(),
        verification_feedback = NULL
    WHERE id = v_activity_id;
  ELSE
    -- Some pending (and none rejected)
    UPDATE public.daily_activities
    SET is_verified = false,
        verified_at = NULL,
        verified_by = NULL
    WHERE id = v_activity_id;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS sync_activity_verification_from_sections_trigger ON public.activity_section_verifications;
CREATE TRIGGER sync_activity_verification_from_sections_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.activity_section_verifications
FOR EACH ROW
EXECUTE FUNCTION public.sync_activity_verification_from_sections();

-- RLS for section verifications
DROP POLICY IF EXISTS "View section verifications for accessible activities" ON public.activity_section_verifications;
CREATE POLICY "View section verifications for accessible activities"
ON public.activity_section_verifications FOR SELECT
USING (public.can_view_activity(auth.uid(), activity_id));

DROP POLICY IF EXISTS "Upsert section verifications (admins/sub-trainers)" ON public.activity_section_verifications;
CREATE POLICY "Upsert section verifications (admins/sub-trainers)"
ON public.activity_section_verifications FOR INSERT
WITH CHECK (
  public.can_view_activity(auth.uid(), activity_id)
  AND (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'sub_trainer')
  )
);

DROP POLICY IF EXISTS "Update section verifications (admins/sub-trainers)" ON public.activity_section_verifications;
CREATE POLICY "Update section verifications (admins/sub-trainers)"
ON public.activity_section_verifications FOR UPDATE
USING (
  public.can_view_activity(auth.uid(), activity_id)
  AND (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'sub_trainer')
  )
);


