-- Same-day todo planning only + fix todo log office_id for admin visibility

CREATE OR REPLACE FUNCTION public.is_todo_date_editable(p_todo_date date)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT
    p_todo_date = (timezone('Africa/Lagos', now()))::date
    AND NOT public.is_submission_locked(p_todo_date);
$$;

COMMENT ON FUNCTION public.is_todo_date_editable(date) IS
  'True only for today (WAT) before 11:59 PM lock. Past and future dates are read-only.';

CREATE OR REPLACE FUNCTION public.log_daily_todo_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_office_id uuid;
BEGIN
  v_office_id := NEW.office_id;
  IF v_office_id IS NULL THEN
    v_office_id := public.get_user_office_id(NEW.user_id);
  END IF;

  IF TG_OP = 'INSERT' OR (OLD.plan IS DISTINCT FROM NEW.plan) THEN
    INSERT INTO public.daily_todo_logs (daily_todo_id, user_id, todo_date, plan, office_id)
    VALUES (NEW.id, NEW.user_id, NEW.todo_date, NEW.plan, v_office_id);
  END IF;
  RETURN NEW;
END;
$$;

-- Backfill log rows missing office_id
UPDATE public.daily_todo_logs l
SET office_id = p.office_id
FROM public.profiles p
WHERE l.user_id = p.user_id
  AND l.office_id IS DISTINCT FROM p.office_id;

UPDATE public.daily_todo_logs l
SET office_id = public.get_user_office_id(l.user_id)
WHERE l.office_id IS NULL;
