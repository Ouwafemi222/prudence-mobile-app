-- App-wide Supabase Realtime for in-app sync (RLS scopes events per user)
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.daily_todos REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.activity_comments REPLICA IDENTITY FULL;
ALTER TABLE public.activity_section_verifications REPLICA IDENTITY FULL;

DO $$
BEGIN
  FOREACH tab IN ARRAY ARRAY[
    'notifications',
    'daily_todos',
    'profiles',
    'activity_comments',
    'activity_section_verifications'
  ]::text[]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = tab
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tab);
    END IF;
  END LOOP;
END $$;
