-- Fix Skills RLS Policies
-- Drops old conflicting policies and ensures correct access

-- Drop old policies that might conflict
DROP POLICY IF EXISTS "Approved users can view skills" ON public.skills;
DROP POLICY IF EXISTS "Admins can manage skills" ON public.skills;
DROP POLICY IF EXISTS "Users can view active skills" ON public.skills;

-- Create unified policy for viewing skills
-- All authenticated users can view active skills
-- Admins and trainers can view all skills (including inactive)
CREATE POLICY "Users can view active skills"
  ON public.skills
  FOR SELECT
  USING (
    is_active = true 
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'trainer')
    )
  );

-- Admins can manage (insert, update, delete) all skills
CREATE POLICY "Admins can manage skills"
  ON public.skills
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'trainer')
    )
  );
