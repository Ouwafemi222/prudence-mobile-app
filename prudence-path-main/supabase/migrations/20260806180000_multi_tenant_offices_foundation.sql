-- Phase 1: Multi-tenant foundation — offices table, office_id columns, Office #1 backfill

-- 1) office_admin role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'office_admin';

-- 2) Offices (tenant root)
CREATE TABLE IF NOT EXISTS public.offices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'pending')),
  timezone text NOT NULL DEFAULT 'Africa/Lagos',
  plan text NOT NULL DEFAULT 'free',
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT offices_slug_unique UNIQUE (slug)
);

CREATE INDEX IF NOT EXISTS offices_status_idx ON public.offices (status);

DROP TRIGGER IF EXISTS update_offices_updated_at ON public.offices;
CREATE TRIGGER update_offices_updated_at
  BEFORE UPDATE ON public.offices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.offices ENABLE ROW LEVEL SECURITY;

-- Everyone can read active offices (for signup slug validation); super_admin manages all
CREATE POLICY "Anyone can view active offices"
  ON public.offices FOR SELECT
  TO anon, authenticated
  USING (status = 'active');

CREATE POLICY "Super admin manages offices"
  ON public.offices FOR ALL
  TO authenticated
  USING (public.user_is_super_admin(auth.uid()))
  WITH CHECK (public.user_is_super_admin(auth.uid()));

-- 3) Seed Office #1 — Prudence
INSERT INTO public.offices (slug, name, status, timezone, plan, settings)
VALUES (
  'prudence',
  'Prudence',
  'active',
  'Africa/Lagos',
  'free',
  '{"is_template_source": true}'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

-- 4) Add office_id columns (nullable first)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS office_id uuid REFERENCES public.offices(id);
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS office_id uuid REFERENCES public.offices(id);
ALTER TABLE public.skills ADD COLUMN IF NOT EXISTS office_id uuid REFERENCES public.offices(id);
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS office_id uuid REFERENCES public.offices(id);
ALTER TABLE public.daily_activities ADD COLUMN IF NOT EXISTS office_id uuid REFERENCES public.offices(id);
ALTER TABLE public.weekly_reports ADD COLUMN IF NOT EXISTS office_id uuid REFERENCES public.offices(id);
ALTER TABLE public.monthly_goals ADD COLUMN IF NOT EXISTS office_id uuid REFERENCES public.offices(id);
ALTER TABLE public.daily_todos ADD COLUMN IF NOT EXISTS office_id uuid REFERENCES public.offices(id);
ALTER TABLE public.daily_todo_logs ADD COLUMN IF NOT EXISTS office_id uuid REFERENCES public.offices(id);
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS office_id uuid REFERENCES public.offices(id);
ALTER TABLE public.user_skills ADD COLUMN IF NOT EXISTS office_id uuid REFERENCES public.offices(id);
ALTER TABLE public.activity_comments ADD COLUMN IF NOT EXISTS office_id uuid REFERENCES public.offices(id);
ALTER TABLE public.activity_section_verifications ADD COLUMN IF NOT EXISTS office_id uuid REFERENCES public.offices(id);

-- 5) Backfill with Office #1
DO $$
DECLARE
  v_office_id uuid;
BEGIN
  SELECT id INTO v_office_id FROM public.offices WHERE slug = 'prudence' LIMIT 1;
  IF v_office_id IS NULL THEN
    RAISE EXCEPTION 'Office #1 (prudence) not found';
  END IF;

  UPDATE public.profiles SET office_id = v_office_id WHERE office_id IS NULL;
  UPDATE public.groups SET office_id = v_office_id WHERE office_id IS NULL;
  UPDATE public.skills SET office_id = v_office_id WHERE office_id IS NULL;
  UPDATE public.user_roles SET office_id = v_office_id WHERE office_id IS NULL;
  UPDATE public.daily_activities SET office_id = v_office_id WHERE office_id IS NULL;
  UPDATE public.weekly_reports SET office_id = v_office_id WHERE office_id IS NULL;
  UPDATE public.monthly_goals SET office_id = v_office_id WHERE office_id IS NULL;
  UPDATE public.daily_todos SET office_id = v_office_id WHERE office_id IS NULL;
  UPDATE public.daily_todo_logs SET office_id = v_office_id WHERE office_id IS NULL;
  UPDATE public.notifications SET office_id = v_office_id WHERE office_id IS NULL;
  UPDATE public.user_skills SET office_id = v_office_id WHERE office_id IS NULL;

  UPDATE public.activity_comments ac
  SET office_id = da.office_id
  FROM public.daily_activities da
  WHERE ac.activity_id = da.id AND ac.office_id IS NULL;

  -- Disable verification sync trigger during office_id backfill (avoids auth check on daily_activities)
  ALTER TABLE public.activity_section_verifications
    DISABLE TRIGGER sync_activity_verification_from_sections_trigger;

  UPDATE public.activity_section_verifications asv
  SET office_id = da.office_id
  FROM public.daily_activities da
  WHERE asv.activity_id = da.id AND asv.office_id IS NULL;

  ALTER TABLE public.activity_section_verifications
    ENABLE TRIGGER sync_activity_verification_from_sections_trigger;
END $$;

-- 6) NOT NULL constraints
ALTER TABLE public.profiles ALTER COLUMN office_id SET NOT NULL;
ALTER TABLE public.groups ALTER COLUMN office_id SET NOT NULL;
ALTER TABLE public.skills ALTER COLUMN office_id SET NOT NULL;
ALTER TABLE public.user_roles ALTER COLUMN office_id SET NOT NULL;
ALTER TABLE public.daily_activities ALTER COLUMN office_id SET NOT NULL;
ALTER TABLE public.weekly_reports ALTER COLUMN office_id SET NOT NULL;
ALTER TABLE public.monthly_goals ALTER COLUMN office_id SET NOT NULL;
ALTER TABLE public.daily_todos ALTER COLUMN office_id SET NOT NULL;
ALTER TABLE public.daily_todo_logs ALTER COLUMN office_id SET NOT NULL;
ALTER TABLE public.notifications ALTER COLUMN office_id SET NOT NULL;
ALTER TABLE public.user_skills ALTER COLUMN office_id SET NOT NULL;
ALTER TABLE public.activity_comments ALTER COLUMN office_id SET NOT NULL;
ALTER TABLE public.activity_section_verifications ALTER COLUMN office_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS profiles_office_id_idx ON public.profiles (office_id);
CREATE INDEX IF NOT EXISTS profiles_office_username_idx ON public.profiles (office_id, lower(username));
CREATE INDEX IF NOT EXISTS groups_office_id_idx ON public.groups (office_id);
CREATE INDEX IF NOT EXISTS skills_office_id_idx ON public.skills (office_id);
CREATE INDEX IF NOT EXISTS daily_activities_office_id_idx ON public.daily_activities (office_id);

-- 7) Username unique per office (not global)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_username_key;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_office_username_unique
  ON public.profiles (office_id, lower(username));

-- 8) Helper functions
CREATE OR REPLACE FUNCTION public.get_office_id_by_slug(p_slug text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.offices
  WHERE slug = lower(trim(p_slug)) AND status = 'active'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_user_office_id(p_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT office_id FROM public.profiles WHERE user_id = p_user_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.users_share_office(p_user_a uuid, p_user_b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles a
    JOIN public.profiles b ON b.office_id = a.office_id
    WHERE a.user_id = p_user_a AND b.user_id = p_user_b
  );
$$;

CREATE OR REPLACE FUNCTION public.user_is_office_admin(p_user_id uuid, p_office_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.profiles p ON p.user_id = ur.user_id
    WHERE ur.user_id = p_user_id
      AND ur.role = 'office_admin'::public.app_role
      AND (p_office_id IS NULL OR p.office_id = p_office_id)
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_office_id_by_slug(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_office_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.users_share_office(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_is_office_admin(uuid, uuid) TO authenticated;

-- 9) Username availability scoped to office
DROP FUNCTION IF EXISTS public.is_username_available(text);

CREATE OR REPLACE FUNCTION public.is_username_available(p_username text, p_office_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_username text := lower(trim(p_username));
  v_office_id uuid := p_office_id;
BEGIN
  IF v_username IS NULL OR length(v_username) < 3 THEN
    RETURN false;
  END IF;

  IF v_office_id IS NULL THEN
    SELECT id INTO v_office_id FROM public.offices WHERE slug = 'prudence' LIMIT 1;
  END IF;

  IF v_office_id IS NULL THEN
    RETURN false;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.office_id = v_office_id AND lower(p.username) = v_username
  ) THEN
    RETURN false;
  END IF;

  IF EXISTS (
    SELECT 1 FROM auth.users u
    WHERE lower(COALESCE(u.raw_user_meta_data->>'username', '')) = v_username
      AND u.email_confirmed_at IS NULL
      AND COALESCE(
        public.get_office_id_by_slug(u.raw_user_meta_data->>'office_slug'),
        (SELECT id FROM public.offices WHERE slug = 'prudence' LIMIT 1)
      ) = v_office_id
  ) THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_username_available(text, uuid) TO anon, authenticated;

-- 10) Default office on new profile (until Phase 5 invite flow)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_office_id uuid;
  v_office_slug text;
BEGIN
  IF NEW.email_confirmed_at IS NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  v_office_slug := NULLIF(lower(trim(COALESCE(NEW.raw_user_meta_data->>'office_slug', ''))), '');
  IF v_office_slug IS NOT NULL THEN
    v_office_id := public.get_office_id_by_slug(v_office_slug);
  END IF;
  IF v_office_id IS NULL THEN
    SELECT id INTO v_office_id FROM public.offices WHERE slug = 'prudence' LIMIT 1;
  END IF;

  INSERT INTO public.profiles (user_id, full_name, username, sponsor_username, email, office_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    lower(COALESCE(NEW.raw_user_meta_data->>'username', '')),
    NULLIF(lower(COALESCE(NEW.raw_user_meta_data->>'sponsor_username', '')), ''),
    NEW.email,
    v_office_id
  );

  INSERT INTO public.user_roles (user_id, role, office_id)
  VALUES (NEW.id, 'member', v_office_id);

  RETURN NEW;
END;
$$;

-- 11) Auto-set office_id on user-owned inserts via trigger (safety net)
CREATE OR REPLACE FUNCTION public.set_office_id_from_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_office_id uuid;
BEGIN
  IF NEW.office_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  v_office_id := public.get_user_office_id(NEW.user_id);
  IF v_office_id IS NOT NULL THEN
    NEW.office_id := v_office_id;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'daily_activities', 'weekly_reports', 'monthly_goals',
    'daily_todos', 'daily_todo_logs', 'notifications', 'user_skills'
  ]::text[]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_set_office_id ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_set_office_id BEFORE INSERT ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.set_office_id_from_profile()',
      t
    );
  END LOOP;
END $$;

COMMENT ON TABLE public.offices IS 'Multi-tenant office workspaces. Office #1 slug=prudence.';
