-- Enable Supabase Realtime for daily_activities (dashboard consistency, submissions, etc.)
ALTER TABLE public.daily_activities REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'daily_activities'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_activities;
  END IF;
END $$;
