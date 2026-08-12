-- Multiple goals book photos per monthly goal

ALTER TABLE public.monthly_goals
  ADD COLUMN IF NOT EXISTS goal_book_images text[] NOT NULL DEFAULT '{}';

UPDATE public.monthly_goals
SET goal_book_images = ARRAY[goal_book_image]
WHERE goal_book_image IS NOT NULL
  AND trim(goal_book_image) <> ''
  AND (goal_book_images IS NULL OR goal_book_images = '{}');

DROP FUNCTION IF EXISTS public.get_or_generate_monthly_goal(uuid);

CREATE OR REPLACE FUNCTION public.get_or_generate_monthly_goal(p_user_id uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  month_year date,
  target_pages integer,
  target_gigs integer,
  target_accounts integer,
  target_income numeric,
  target_contacts integer,
  target_tags integer,
  target_conversions integer,
  things_to_learn text,
  goal_book_image text,
  goal_book_images text[],
  goals_submitted_at timestamptz,
  actual_pages integer,
  actual_gigs integer,
  actual_accounts integer,
  actual_income numeric,
  actual_contacts integer,
  actual_tags integer,
  actual_conversions integer,
  actual_things_learned text,
  consistency_score numeric,
  skill_progress_notes text,
  income_summary text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date;
  v_month_start date;
  v_goal_id uuid;
BEGIN
  IF NOT (
    auth.uid() = p_user_id
    OR public.is_admin(auth.uid())
    OR (public.has_role(auth.uid(), 'sponsor') AND public.sponsor_can_access_user(auth.uid(), p_user_id))
    OR (public.has_role(auth.uid(), 'pro') AND public.pro_can_access_user(auth.uid(), p_user_id))
  ) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  v_today := (timezone('Africa/Lagos', now()))::date;
  v_month_start := date_trunc('month', v_today)::date;
  v_goal_id := public.calculate_monthly_actuals(p_user_id, v_month_start);

  RETURN QUERY
  SELECT
    mg.id,
    mg.user_id,
    mg.month_year,
    mg.target_pages,
    mg.target_gigs,
    mg.target_accounts,
    mg.target_income,
    mg.target_contacts,
    mg.target_tags,
    mg.target_conversions,
    mg.things_to_learn,
    mg.goal_book_image,
    mg.goal_book_images,
    mg.goals_submitted_at,
    mg.actual_pages,
    mg.actual_gigs,
    mg.actual_accounts,
    mg.actual_income,
    mg.actual_contacts,
    mg.actual_tags,
    mg.actual_conversions,
    mg.actual_things_learned,
    mg.consistency_score,
    mg.skill_progress_notes,
    mg.income_summary,
    mg.created_at,
    mg.updated_at
  FROM public.monthly_goals mg
  WHERE mg.id = v_goal_id;
END;
$$;
