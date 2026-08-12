-- Phase 2: Provision new offices from approved applications

ALTER TABLE public.office_applications
  ADD COLUMN IF NOT EXISTS provisioned_office_id uuid REFERENCES public.offices(id);

CREATE INDEX IF NOT EXISTS office_applications_provisioned_office_idx
  ON public.office_applications (provisioned_office_id)
  WHERE provisioned_office_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.slugify_office_name(p_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(
    trim(both '-' from regexp_replace(lower(trim(COALESCE(p_name, ''))), '[^a-z0-9]+', '-', 'g')),
    ''
  );
$$;

CREATE OR REPLACE FUNCTION public.provision_office_from_application(
  p_application_id uuid,
  p_slug text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app public.office_applications%ROWTYPE;
  v_template_office_id uuid;
  v_base_slug text;
  v_slug text;
  v_suffix integer := 0;
  v_office_id uuid;
  v_skills_cloned integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.user_is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only super admins can provision offices';
  END IF;

  SELECT * INTO v_app
  FROM public.office_applications
  WHERE id = p_application_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  IF v_app.provisioned_office_id IS NOT NULL THEN
    RAISE EXCEPTION 'Application already provisioned';
  END IF;

  IF v_app.status NOT IN ('pending', 'contacted') THEN
    RAISE EXCEPTION 'Application status must be pending or contacted to provision';
  END IF;

  SELECT id INTO v_template_office_id
  FROM public.offices
  WHERE slug = 'prudence'
  LIMIT 1;

  IF v_template_office_id IS NULL THEN
    RAISE EXCEPTION 'Template office (prudence) not found';
  END IF;

  v_base_slug := COALESCE(
    NULLIF(lower(trim(p_slug)), ''),
    public.slugify_office_name(v_app.organization_name)
  );

  IF v_base_slug IS NULL OR length(v_base_slug) < 2 THEN
    RAISE EXCEPTION 'Could not derive a valid office slug';
  END IF;

  v_slug := v_base_slug;
  WHILE EXISTS (SELECT 1 FROM public.offices WHERE slug = v_slug) LOOP
    v_suffix := v_suffix + 1;
    v_slug := v_base_slug || '-' || v_suffix::text;
  END LOOP;

  INSERT INTO public.offices (slug, name, status, timezone, plan, settings)
  VALUES (
    v_slug,
    v_app.organization_name,
    'active',
    'Africa/Lagos',
    'free',
    jsonb_build_object(
      'provisioned_from_application', p_application_id,
      'pending_admin_email', lower(trim(v_app.contact_email)),
      'pending_admin_name', v_app.contact_name,
      'application_team_size', v_app.team_size,
      'application_country', v_app.country
    )
  )
  RETURNING id INTO v_office_id;

  INSERT INTO public.skills (
    name, overview, theory, practical, tools, outcomes,
    display_order, is_active, is_mandatory, trainers,
    training_plan_pdf_path, office_id
  )
  SELECT
    s.name, s.overview, s.theory, s.practical, s.tools, s.outcomes,
    s.display_order, s.is_active, s.is_mandatory, s.trainers,
    s.training_plan_pdf_path, v_office_id
  FROM public.skills s
  WHERE s.office_id = v_template_office_id;

  GET DIAGNOSTICS v_skills_cloned = ROW_COUNT;

  UPDATE public.office_applications
  SET
    status = 'approved',
    provisioned_office_id = v_office_id,
    admin_notes = trim(both E'\n' from concat_ws(
      E'\n',
      NULLIF(trim(COALESCE(admin_notes, '')), ''),
      'Provisioned ' || to_char(now(), 'YYYY-MM-DD') || ' as office slug: ' || v_slug
    )),
    updated_at = now()
  WHERE id = p_application_id;

  RETURN jsonb_build_object(
    'office_id', v_office_id,
    'slug', v_slug,
    'name', v_app.organization_name,
    'skills_cloned', v_skills_cloned,
    'pending_admin_email', lower(trim(v_app.contact_email)),
    'signup_path', '/auth?tab=signup&office=' || v_slug
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.provision_office_from_application(uuid, text) TO authenticated;

-- First signup with matching pending_admin_email becomes office_admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_office_id uuid;
  v_office_slug text;
  v_role public.app_role := 'member';
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

  IF EXISTS (
    SELECT 1 FROM public.offices o
    WHERE o.id = v_office_id
      AND lower(trim(COALESCE(o.settings->>'pending_admin_email', ''))) = lower(trim(NEW.email))
  ) THEN
    v_role := 'office_admin';
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
  VALUES (NEW.id, v_role, v_office_id);

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.provision_office_from_application(uuid, text)
  IS 'Super admin: create office from application, clone Prudence skills, store pending admin email';
