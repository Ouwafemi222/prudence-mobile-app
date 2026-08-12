ALTER TABLE public.daily_activities
  ADD COLUMN IF NOT EXISTS payment_type text,
  ADD COLUMN IF NOT EXISTS outside_payment_method text,
  ADD COLUMN IF NOT EXISTS outside_payment_method_other text,
  ADD COLUMN IF NOT EXISTS fiverr_fee numeric;


