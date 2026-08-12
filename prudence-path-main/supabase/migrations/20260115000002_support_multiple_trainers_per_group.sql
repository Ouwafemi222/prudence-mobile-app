-- Support Multiple Trainers Per Group
-- Changes groups.trainer_id to groups.trainer_ids (array)

-- Step 1: Add new column for multiple trainers
ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS trainer_ids UUID[] DEFAULT ARRAY[]::UUID[];

-- Step 2: Migrate existing single trainer_id to trainer_ids array
UPDATE public.groups
SET trainer_ids = CASE
  WHEN trainer_id IS NOT NULL THEN ARRAY[trainer_id]
  ELSE ARRAY[]::UUID[]
END
WHERE trainer_ids IS NULL OR array_length(trainer_ids, 1) IS NULL;

-- Step 3: Create index for array queries
CREATE INDEX IF NOT EXISTS idx_groups_trainer_ids ON public.groups USING GIN (trainer_ids);

-- Note: We keep trainer_id column for backward compatibility but it's deprecated
-- New code should use trainer_ids array instead
