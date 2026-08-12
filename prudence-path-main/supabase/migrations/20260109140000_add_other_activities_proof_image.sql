-- Add proof image for Other Activities

ALTER TABLE public.daily_activities
ADD COLUMN IF NOT EXISTS other_activities_proof_image text;


