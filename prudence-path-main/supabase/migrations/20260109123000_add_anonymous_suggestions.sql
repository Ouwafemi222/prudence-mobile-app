-- Anonymous suggestions

CREATE TABLE IF NOT EXISTS public.suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;

-- Allow anyone (anon or authed) to insert. If authed, we store user_id automatically.
DROP POLICY IF EXISTS "Anyone can submit suggestions" ON public.suggestions;
CREATE POLICY "Anyone can submit suggestions"
ON public.suggestions FOR INSERT
WITH CHECK (true);

-- Only admins can view
DROP POLICY IF EXISTS "Admins can view suggestions" ON public.suggestions;
CREATE POLICY "Admins can view suggestions"
ON public.suggestions FOR SELECT
USING (public.is_admin(auth.uid()));

-- Only admins can delete
DROP POLICY IF EXISTS "Admins can delete suggestions" ON public.suggestions;
CREATE POLICY "Admins can delete suggestions"
ON public.suggestions FOR DELETE
USING (public.is_admin(auth.uid()));

-- Trigger to set user_id when authenticated
CREATE OR REPLACE FUNCTION public.set_suggestion_user_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_suggestion_user_id_trigger ON public.suggestions;
CREATE TRIGGER set_suggestion_user_id_trigger
BEFORE INSERT ON public.suggestions
FOR EACH ROW
EXECUTE FUNCTION public.set_suggestion_user_id();


