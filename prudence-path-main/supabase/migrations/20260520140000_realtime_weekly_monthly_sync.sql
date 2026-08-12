-- Accurate aggregate sync (AFTER row is written) + Supabase Realtime for weekly/monthly tables

-- Resubmit-after-reject: reset verification on the row being updated (BEFORE only)
CREATE OR REPLACE FUNCTION public.reset_activity_verification_on_resubmit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.submitted_at IS NOT NULL
     AND OLD.verified_at IS NOT NULL
     AND COALESCE(OLD.is_verified, false) = false THEN
    NEW.is_verified := false;
    NEW.verified_at := NULL;
    NEW.verified_by := NULL;
    NEW.verification_feedback := NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- Regenerate weekly + monthly actuals whenever daily activity data changes
CREATE OR REPLACE FUNCTION public.sync_reports_from_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_activity_date date;
  v_week_start date;
BEGIN
  v_user_id := COALESCE(NEW.user_id, OLD.user_id);
  v_activity_date := COALESCE(NEW.activity_date, OLD.activity_date);
  v_week_start := public.nigeria_week_start(v_activity_date);

  PERFORM public.generate_weekly_report(v_user_id, v_week_start);

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'sync_reports_from_activity: %', SQLERRM;
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_weekly_report_on_activity ON public.daily_activities;
DROP FUNCTION IF EXISTS public.refresh_weekly_report_for_activity();

DROP TRIGGER IF EXISTS trg_reset_verification_on_resubmit ON public.daily_activities;
CREATE TRIGGER trg_reset_verification_on_resubmit
  BEFORE UPDATE ON public.daily_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.reset_activity_verification_on_resubmit();

DROP TRIGGER IF EXISTS trg_sync_reports_from_activity ON public.daily_activities;
CREATE TRIGGER trg_sync_reports_from_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.daily_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_reports_from_activity();

-- Supabase Realtime: push aggregate updates to connected clients
ALTER TABLE public.weekly_reports REPLICA IDENTITY FULL;
ALTER TABLE public.monthly_goals REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'weekly_reports'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.weekly_reports;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'monthly_goals'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.monthly_goals;
  END IF;
END $$;
