-- Prevent trainers from approving/rejecting their own daily submissions.
-- Super admins may still verify anyone (except the existing app rule that
-- super_admin submissions are not verified via UI).

CREATE OR REPLACE FUNCTION public.enforce_submission_verification_permissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  verification_changed boolean;
  actor uuid := auth.uid();
BEGIN
  verification_changed :=
    OLD.is_verified IS DISTINCT FROM NEW.is_verified
    OR OLD.verified_at IS DISTINCT FROM NEW.verified_at
    OR OLD.verified_by IS DISTINCT FROM NEW.verified_by
    OR OLD.verification_feedback IS DISTINCT FROM NEW.verification_feedback;

  IF NOT verification_changed THEN
    RETURN NEW;
  END IF;

  -- Owners may reset verification fields on resubmit (cleared, not newly verified).
  IF actor IS NOT NULL
     AND actor = NEW.user_id
     AND NEW.verified_at IS NULL
     AND NEW.verified_by IS NULL
     AND NEW.verification_feedback IS NULL
     AND COALESCE(NEW.is_verified, false) = false THEN
    RETURN NEW;
  END IF;

  IF actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required to verify submissions';
  END IF;

  IF public.has_role(actor, 'super_admin') THEN
    RETURN NEW;
  END IF;

  IF public.has_role(actor, 'trainer') THEN
    IF actor = NEW.user_id THEN
      RAISE EXCEPTION 'Trainers cannot approve or reject their own submissions';
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Only trainers and super admins can verify submissions';
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_submission_verification_permissions ON public.daily_activities;

CREATE TRIGGER trg_enforce_submission_verification_permissions
  BEFORE UPDATE ON public.daily_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_submission_verification_permissions();
