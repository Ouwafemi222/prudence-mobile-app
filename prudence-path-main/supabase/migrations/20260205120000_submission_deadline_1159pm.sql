-- Change daily submission deadline from 10 PM to 11:59 PM (Nigeria / Africa/Lagos)

CREATE OR REPLACE FUNCTION public.is_submission_locked(p_activity_date date)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_lock_time timestamptz;
BEGIN
  -- Lock time is 11:59 PM Nigeria time (WAT) on the activity date
  v_lock_time := (p_activity_date::timestamp + time '23:59') AT TIME ZONE 'Africa/Lagos';
  RETURN now() >= v_lock_time;
END;
$$;
