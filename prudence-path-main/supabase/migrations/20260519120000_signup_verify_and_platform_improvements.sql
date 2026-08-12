-- Defer app records until email is confirmed; username availability; weekly sync; gigs/accounts media; tags

-- 1) Signup: only create profile + role after email confirmation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.profiles (user_id, full_name, username, sponsor_username, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    lower(COALESCE(NEW.raw_user_meta_data->>'username', '')),
    NULLIF(lower(COALESCE(NEW.raw_user_meta_data->>'sponsor_username', '')), ''),
    NEW.email
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'member');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  WHEN (NEW.email_confirmed_at IS NOT NULL)
  EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_auth_user_email_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
  EXECUTE FUNCTION public.handle_new_user();

-- 2) Username availability (profiles + pending unconfirmed signups)
CREATE OR REPLACE FUNCTION public.is_username_available(p_username text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_username text := lower(trim(p_username));
BEGIN
  IF v_username IS NULL OR length(v_username) < 3 THEN
    RETURN false;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE lower(p.username) = v_username
  ) THEN
    RETURN false;
  END IF;

  IF EXISTS (
    SELECT 1 FROM auth.users u
    WHERE lower(COALESCE(u.raw_user_meta_data->>'username', '')) = v_username
      AND u.email_confirmed_at IS NULL
  ) THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_username_available(text) TO anon, authenticated;

-- 3) Refresh weekly report when daily activity changes
CREATE OR REPLACE FUNCTION public.refresh_weekly_report_for_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week_start date;
BEGIN
  v_week_start := COALESCE(NEW.activity_date, OLD.activity_date)::date
    - (extract(isodow from COALESCE(NEW.activity_date, OLD.activity_date)::date)::int - 1);
  PERFORM public.generate_weekly_report(COALESCE(NEW.user_id, OLD.user_id), v_week_start);
  RETURN COALESCE(NEW, OLD);
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'refresh_weekly_report_for_activity: %', SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_weekly_report_on_activity ON public.daily_activities;
CREATE TRIGGER trg_refresh_weekly_report_on_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.daily_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.refresh_weekly_report_for_activity();

-- 4) Gigs / accounts proof images and notes
ALTER TABLE public.daily_activities
  ADD COLUMN IF NOT EXISTS gig_proof_images text[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS gig_notes text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS account_proof_images text[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS account_notes text DEFAULT NULL;

-- 5) Optional submission tags
ALTER TABLE public.daily_activities
  ADD COLUMN IF NOT EXISTS submission_tags text[] DEFAULT NULL;

-- 6) Cleanup stale unconfirmed auth users (for cron / edge function)
CREATE OR REPLACE FUNCTION public.cleanup_stale_unconfirmed_users(p_max_age_hours integer DEFAULT 48)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_deleted integer := 0;
  r record;
BEGIN
  FOR r IN
    SELECT id FROM auth.users
    WHERE email_confirmed_at IS NULL
      AND created_at < now() - (p_max_age_hours || ' hours')::interval
  LOOP
    DELETE FROM auth.users WHERE id = r.id;
    v_deleted := v_deleted + 1;
  END LOOP;
  RETURN v_deleted;
END;
$$;
