-- One tag per user per daily report (office-scoped via daily_activities.office_id)

DROP TRIGGER IF EXISTS trg_sync_submission_tags_registry ON public.daily_activities;
DROP FUNCTION IF EXISTS public.sync_submission_tags_registry();

DROP TABLE IF EXISTS public.user_submission_tags;

CREATE OR REPLACE FUNCTION public.validate_submission_tags()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_tag text;
  v_len int;
BEGIN
  IF NEW.submission_tags IS NULL OR COALESCE(array_length(NEW.submission_tags, 1), 0) = 0 THEN
    NEW.submission_tags := NULL;
    RETURN NEW;
  END IF;

  v_len := array_length(NEW.submission_tags, 1);
  IF v_len > 1 THEN
    RAISE EXCEPTION 'tag_limit_exceeded: Only one tag is allowed per daily report.'
      USING ERRCODE = 'check_violation';
  END IF;

  v_tag := lower(trim(NEW.submission_tags[1]));
  IF v_tag = '' THEN
    NEW.submission_tags := NULL;
  ELSE
    NEW.submission_tags := ARRAY[v_tag];
  END IF;

  RETURN NEW;
END;
$$;
