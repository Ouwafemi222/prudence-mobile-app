-- One tag per user per office (lifetime registry)

CREATE TABLE IF NOT EXISTS public.user_submission_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  office_id uuid NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
  tag text NOT NULL,
  first_activity_id uuid REFERENCES public.daily_activities(id) ON DELETE SET NULL,
  first_used_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_submission_tags_user_office_tag_unique UNIQUE (user_id, office_id, tag)
);

CREATE INDEX IF NOT EXISTS user_submission_tags_user_office_idx
  ON public.user_submission_tags (user_id, office_id);

ALTER TABLE public.user_submission_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own submission tags"
  ON public.user_submission_tags FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view office submission tags"
  ON public.user_submission_tags FOR SELECT TO authenticated
  USING (
    public.user_can_access_office(office_id)
    AND (
      public.is_admin(auth.uid())
      OR public.user_is_office_admin(auth.uid(), office_id)
    )
  );

CREATE POLICY "Users can insert own submission tags"
  ON public.user_submission_tags FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.user_can_access_office(office_id)
  );

-- Backfill from existing daily activities (earliest use per tag)
INSERT INTO public.user_submission_tags (user_id, office_id, tag, first_activity_id, first_used_date)
SELECT DISTINCT ON (da.user_id, da.office_id, lower(trim(t.tag)))
  da.user_id,
  da.office_id,
  lower(trim(t.tag)),
  da.id,
  da.activity_date
FROM public.daily_activities da
CROSS JOIN LATERAL unnest(da.submission_tags) AS t(tag)
WHERE da.submission_tags IS NOT NULL
  AND trim(t.tag) <> ''
ORDER BY da.user_id, da.office_id, lower(trim(t.tag)), da.activity_date ASC
ON CONFLICT (user_id, office_id, tag) DO NOTHING;

CREATE OR REPLACE FUNCTION public.validate_submission_tags()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_tag text;
BEGIN
  IF NEW.submission_tags IS NULL OR COALESCE(array_length(NEW.submission_tags, 1), 0) = 0 THEN
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
    IF EXISTS (
      SELECT 1
      FROM public.user_submission_tags ust
      WHERE ust.user_id = NEW.user_id
        AND ust.office_id = NEW.office_id
        AND ust.tag = v_tag
        AND ust.first_activity_id IS DISTINCT FROM NEW.id
    ) THEN
      RAISE EXCEPTION 'tag_already_used: Tag "%" was already used on another day.', v_tag
        USING ERRCODE = 'check_violation';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_submission_tags_registry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tag text;
BEGIN
  IF NEW.submission_tags IS NULL OR COALESCE(array_length(NEW.submission_tags, 1), 0) = 0 THEN
    RETURN NEW;
  END IF;

  FOREACH v_tag IN ARRAY NEW.submission_tags LOOP
    v_tag := lower(trim(v_tag));
    IF v_tag = '' THEN
      CONTINUE;
    END IF;
    INSERT INTO public.user_submission_tags (user_id, office_id, tag, first_activity_id, first_used_date)
    VALUES (NEW.user_id, NEW.office_id, v_tag, NEW.id, NEW.activity_date)
    ON CONFLICT (user_id, office_id, tag) DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_submission_tags ON public.daily_activities;
CREATE TRIGGER trg_validate_submission_tags
  BEFORE INSERT OR UPDATE OF submission_tags ON public.daily_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_submission_tags();

DROP TRIGGER IF EXISTS trg_sync_submission_tags_registry ON public.daily_activities;
CREATE TRIGGER trg_sync_submission_tags_registry
  AFTER INSERT OR UPDATE OF submission_tags ON public.daily_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_submission_tags_registry();
