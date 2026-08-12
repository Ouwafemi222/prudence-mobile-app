-- Fix: new daily activity inserts fail because section verifications omit office_id
-- Fix: trainer comments fail because activity_comments omit office_id

CREATE OR REPLACE FUNCTION public.ensure_activity_section_verifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sections text[] := ARRAY['reading','gigs','accounts','income','prospecting','skills','other','training'];
  s text;
  v_office_id uuid;
BEGIN
  v_office_id := NEW.office_id;
  IF v_office_id IS NULL THEN
    v_office_id := public.get_user_office_id(NEW.user_id);
  END IF;

  FOREACH s IN ARRAY sections LOOP
    INSERT INTO public.activity_section_verifications(activity_id, section, status, office_id)
    VALUES (NEW.id, s, 'pending', v_office_id)
    ON CONFLICT (activity_id, section) DO NOTHING;
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_office_id_from_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_office_id uuid;
BEGIN
  IF NEW.office_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  SELECT da.office_id INTO v_office_id
  FROM public.daily_activities da
  WHERE da.id = NEW.activity_id;
  IF v_office_id IS NOT NULL THEN
    NEW.office_id := v_office_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_office_id_from_activity ON public.activity_comments;
CREATE TRIGGER trg_set_office_id_from_activity
  BEFORE INSERT ON public.activity_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_office_id_from_activity();
