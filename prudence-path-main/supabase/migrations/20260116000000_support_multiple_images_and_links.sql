-- Migration: Support multiple images and links in daily_activities
-- Changes:
-- 1. Convert single image fields to arrays (reading_proof_image, skill_proof_image, other_activities_proof_image)
-- 2. Convert gig_link to gig_links array
-- 3. Add account_links array for account creation links

-- Step 1: Add new array columns
ALTER TABLE public.daily_activities
  ADD COLUMN IF NOT EXISTS reading_proof_images TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS skill_proof_images TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS other_activities_proof_images TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS gig_links TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS account_links TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Step 2: Migrate existing single values to arrays
-- Migrate reading_proof_image to reading_proof_images
UPDATE public.daily_activities
SET reading_proof_images = CASE 
  WHEN reading_proof_image IS NOT NULL AND reading_proof_image != '' 
  THEN ARRAY[reading_proof_image]
  ELSE ARRAY[]::TEXT[]
END
WHERE reading_proof_images = ARRAY[]::TEXT[] OR reading_proof_images IS NULL;

-- Migrate skill_proof_image to skill_proof_images
UPDATE public.daily_activities
SET skill_proof_images = CASE 
  WHEN skill_proof_image IS NOT NULL AND skill_proof_image != '' 
  THEN ARRAY[skill_proof_image]
  ELSE ARRAY[]::TEXT[]
END
WHERE skill_proof_images = ARRAY[]::TEXT[] OR skill_proof_images IS NULL;

-- Migrate other_activities_proof_image to other_activities_proof_images
UPDATE public.daily_activities
SET other_activities_proof_images = CASE 
  WHEN other_activities_proof_image IS NOT NULL AND other_activities_proof_image != '' 
  THEN ARRAY[other_activities_proof_image]
  ELSE ARRAY[]::TEXT[]
END
WHERE other_activities_proof_images = ARRAY[]::TEXT[] OR other_activities_proof_images IS NULL;

-- Migrate gig_link to gig_links
UPDATE public.daily_activities
SET gig_links = CASE 
  WHEN gig_link IS NOT NULL AND gig_link != '' 
  THEN ARRAY[gig_link]
  ELSE ARRAY[]::TEXT[]
END
WHERE gig_links = ARRAY[]::TEXT[] OR gig_links IS NULL;

-- Step 3: Keep old columns for backward compatibility during transition
-- We'll drop them in a future migration after confirming everything works
-- For now, we'll keep both old and new columns

-- Add comments
COMMENT ON COLUMN public.daily_activities.reading_proof_images IS 'Array of reading proof image paths';
COMMENT ON COLUMN public.daily_activities.skill_proof_images IS 'Array of skill proof image paths';
COMMENT ON COLUMN public.daily_activities.other_activities_proof_images IS 'Array of other activities proof image paths';
COMMENT ON COLUMN public.daily_activities.gig_links IS 'Array of gig links';
COMMENT ON COLUMN public.daily_activities.account_links IS 'Array of account creation links';
