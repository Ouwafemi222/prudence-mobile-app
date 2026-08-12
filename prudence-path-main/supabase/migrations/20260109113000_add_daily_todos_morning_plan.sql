-- Morning Daily Todo (plan) feature

CREATE TABLE IF NOT EXISTS public.daily_todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  todo_date date NOT NULL,
  plan text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, todo_date)
);

ALTER TABLE public.daily_todos ENABLE ROW LEVEL SECURITY;

-- updated_at trigger
DROP TRIGGER IF EXISTS update_daily_todos_updated_at ON public.daily_todos;
CREATE TRIGGER update_daily_todos_updated_at
  BEFORE UPDATE ON public.daily_todos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Policies
DROP POLICY IF EXISTS "Users can view their own daily todos" ON public.daily_todos;
CREATE POLICY "Users can view their own daily todos"
ON public.daily_todos FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own daily todos" ON public.daily_todos;
CREATE POLICY "Users can manage their own daily todos"
ON public.daily_todos FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all daily todos" ON public.daily_todos;
CREATE POLICY "Admins can view all daily todos"
ON public.daily_todos FOR SELECT
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Pros can view all daily todos" ON public.daily_todos;
CREATE POLICY "Pros can view all daily todos"
ON public.daily_todos FOR SELECT
USING (public.has_role(auth.uid(), 'pro'));

DROP POLICY IF EXISTS "Sub-trainers can view group daily todos" ON public.daily_todos;
CREATE POLICY "Sub-trainers can view group daily todos"
ON public.daily_todos FOR SELECT
USING (
  public.has_role(auth.uid(), 'sub_trainer')
  AND public.sub_trainer_can_access_user(auth.uid(), user_id)
);


