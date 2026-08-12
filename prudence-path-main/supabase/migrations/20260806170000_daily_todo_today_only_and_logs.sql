-- Daily todo: today-only edits (like reports) + version log on each save

CREATE OR REPLACE FUNCTION public.is_todo_date_editable(p_todo_date date)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT p_todo_date = (timezone('Africa/Lagos', now()))::date
    AND NOT public.is_submission_locked(p_todo_date);
$$;

COMMENT ON FUNCTION public.is_todo_date_editable(date) IS
  'True when todo_date is today in Nigeria and before the daily lock (11:59 PM WAT).';

-- Version history: one row per save when plan changes
CREATE TABLE IF NOT EXISTS public.daily_todo_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_todo_id uuid REFERENCES public.daily_todos(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  todo_date date NOT NULL,
  plan text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS daily_todo_logs_user_date_idx
  ON public.daily_todo_logs (user_id, todo_date, created_at DESC);

ALTER TABLE public.daily_todo_logs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.log_daily_todo_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (OLD.plan IS DISTINCT FROM NEW.plan) THEN
    INSERT INTO public.daily_todo_logs (daily_todo_id, user_id, todo_date, plan)
    VALUES (NEW.id, NEW.user_id, NEW.todo_date, NEW.plan);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_daily_todo_change ON public.daily_todos;
CREATE TRIGGER trg_log_daily_todo_change
  AFTER INSERT OR UPDATE OF plan ON public.daily_todos
  FOR EACH ROW
  EXECUTE FUNCTION public.log_daily_todo_change();

-- Replace broad manage policy with today-only insert/update
DROP POLICY IF EXISTS "Users can manage their own daily todos" ON public.daily_todos;

CREATE POLICY "Users can insert own daily todos for today"
  ON public.daily_todos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_todo_date_editable(todo_date)
  );

CREATE POLICY "Users can update own daily todos for today"
  ON public.daily_todos
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND public.is_todo_date_editable(todo_date)
  )
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_todo_date_editable(todo_date)
  );

-- Log visibility mirrors daily_todos
CREATE POLICY "Users can view their own daily todo logs"
  ON public.daily_todo_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all daily todo logs"
  ON public.daily_todo_logs
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Pros can view group daily todo logs"
  ON public.daily_todo_logs
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'pro')
    AND public.pro_can_access_user(auth.uid(), user_id)
  );

CREATE POLICY "Sponsors can view downline daily todo logs"
  ON public.daily_todo_logs
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'sponsor')
    AND public.sponsor_can_access_user(auth.uid(), user_id)
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'daily_todo_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_todo_logs;
  END IF;
END $$;
