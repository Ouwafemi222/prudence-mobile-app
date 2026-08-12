-- Allow members to edit today's tags without tag_already_used.
-- Lifetime uniqueness still applies to other days.

CREATE OR REPLACE FUNCTION public.validate_submission_tags()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tag text;
  v_normalized text[] := ARRAY[]::text[];
BEGIN
  IF NEW.submission_tags IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.office_id IS NULL THEN
    NEW.office_id := public.get_user_office_id(NEW.user_id);
  END IF;

  FOREACH v_tag IN ARRAY NEW.submission_tags LOOP
    v_tag := lower(trim(v_tag));
    IF v_tag = '' THEN
      CONTINUE;
    END IF;
    IF NOT (v_tag = ANY(v_normalized)) THEN
      v_normalized := array_append(v_normalized, v_tag);
    END IF;
  END LOOP;

  IF COALESCE(array_length(v_normalized, 1), 0) = 0 THEN
    NEW.submission_tags := NULL;
    RETURN NEW;
  END IF;

  IF array_length(v_normalized, 1) > 10 THEN
    RAISE EXCEPTION 'tag_limit_exceeded: Maximum 10 tags per daily report.'
      USING ERRCODE = 'check_violation';
  END IF;

  NEW.submission_tags := v_normalized;

  FOREACH v_tag IN ARRAY NEW.submission_tags LOOP
    IF EXISTS (
      SELECT 1
      FROM public.user_submission_tags ust
      WHERE ust.user_id = NEW.user_id
        AND ust.office_id = NEW.office_id
        AND ust.tag = v_tag
        AND ust.first_activity_id IS DISTINCT FROM NEW.id
        AND ust.first_used_date IS DISTINCT FROM NEW.activity_date
    ) THEN
      RAISE EXCEPTION 'tag_already_used: Tag "%" was already used on another day.', v_tag
        USING ERRCODE = 'check_violation';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;
