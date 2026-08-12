-- Skills System Overhaul Migration
-- Adds PDF support, mandatory/optional flags, trainers, and user skill tracking

-- Step 1: Add new columns to skills table
ALTER TABLE public.skills
  ADD COLUMN IF NOT EXISTS training_plan_pdf_path TEXT,
  ADD COLUMN IF NOT EXISTS is_mandatory BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS trainers TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Step 2: Create user_skills table for tracking user skill assignments and statuses
CREATE TABLE IF NOT EXISTS public.user_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  skill_id UUID REFERENCES public.skills(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'yet_to_begin' CHECK (status IN ('yet_to_begin', 'started_training', 'completed_training')),
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, skill_id)
);

-- Step 3: Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_skills_user_id ON public.user_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_user_skills_skill_id ON public.user_skills(skill_id);

-- Step 4: Enable RLS on user_skills
ALTER TABLE public.user_skills ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies for user_skills
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own skill assignments" ON public.user_skills;
DROP POLICY IF EXISTS "Admins can view all skill assignments" ON public.user_skills;
DROP POLICY IF EXISTS "Admins can insert skill assignments" ON public.user_skills;
DROP POLICY IF EXISTS "Admins can update skill assignments" ON public.user_skills;

-- Users can view their own skill assignments
CREATE POLICY "Users can view their own skill assignments"
  ON public.user_skills
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all skill assignments
CREATE POLICY "Admins can view all skill assignments"
  ON public.user_skills
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'trainer')
    )
  );

-- Admins can insert skill assignments
CREATE POLICY "Admins can insert skill assignments"
  ON public.user_skills
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'trainer')
    )
  );

-- Admins can update skill assignments
CREATE POLICY "Admins can update skill assignments"
  ON public.user_skills
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'trainer')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'trainer')
    )
  );

-- Step 6: Create function to auto-assign mandatory skills to new approved members
CREATE OR REPLACE FUNCTION public.auto_assign_mandatory_skills()
RETURNS TRIGGER AS $$
DECLARE
  mandatory_skill RECORD;
BEGIN
  -- Only trigger when approval_status changes to 'approved'
  IF NEW.approval_status = 'approved' AND (OLD.approval_status IS NULL OR OLD.approval_status != 'approved') THEN
    -- Loop through all mandatory skills
    FOR mandatory_skill IN
      SELECT id FROM public.skills WHERE is_mandatory = true
    LOOP
      -- Insert user_skill assignment if it doesn't already exist
      INSERT INTO public.user_skills (user_id, skill_id, status, assigned_at)
      VALUES (NEW.user_id, mandatory_skill.id, 'yet_to_begin', now())
      ON CONFLICT (user_id, skill_id) DO NOTHING;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Create trigger to auto-assign mandatory skills
DROP TRIGGER IF EXISTS trigger_auto_assign_mandatory_skills ON public.profiles;
CREATE TRIGGER trigger_auto_assign_mandatory_skills
  AFTER UPDATE OF approval_status ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_mandatory_skills();

-- Step 8: Update existing approved users with mandatory skills (one-time migration)
DO $$
DECLARE
  approved_user RECORD;
  mandatory_skill RECORD;
BEGIN
  -- Loop through all approved users
  FOR approved_user IN
    SELECT user_id FROM public.profiles WHERE approval_status = 'approved'
  LOOP
    -- Loop through all mandatory skills
    FOR mandatory_skill IN
      SELECT id FROM public.skills WHERE is_mandatory = true
    LOOP
      -- Insert user_skill assignment if it doesn't already exist
      INSERT INTO public.user_skills (user_id, skill_id, status, assigned_at)
      VALUES (approved_user.user_id, mandatory_skill.id, 'yet_to_begin', now())
      ON CONFLICT (user_id, skill_id) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- Step 9: Add RLS policy for skills table PDF access (if not exists)
-- Users can view all active skills
DROP POLICY IF EXISTS "Users can view active skills" ON public.skills;
CREATE POLICY "Users can view active skills"
  ON public.skills
  FOR SELECT
  USING (is_active = true OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'trainer')
  ));
