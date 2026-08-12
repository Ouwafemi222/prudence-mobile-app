-- Suggestions: allow images and restrict admin access to SUPER ADMIN only

ALTER TABLE public.suggestions
ADD COLUMN IF NOT EXISTS image_paths text[] NULL;

-- Tighten access: super_admin only (not trainer)
DROP POLICY IF EXISTS "Admins can view suggestions" ON public.suggestions;
DROP POLICY IF EXISTS "Admins can delete suggestions" ON public.suggestions;

CREATE POLICY "Super admins can view suggestions"
ON public.suggestions FOR SELECT
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete suggestions"
ON public.suggestions FOR DELETE
USING (public.has_role(auth.uid(), 'super_admin'));


