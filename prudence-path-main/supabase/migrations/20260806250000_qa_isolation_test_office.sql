-- QA: idempotent test office for cross-office isolation manual testing
-- Slug: qa-isolation-test — NOT for production members; super_admin QA only

DO $$
DECLARE
  v_template_id uuid;
  v_test_id uuid;
  v_skills_cloned integer;
BEGIN
  SELECT id INTO v_template_id FROM public.offices WHERE slug = 'prudence' LIMIT 1;
  IF v_template_id IS NULL THEN
    RAISE EXCEPTION 'Template office prudence not found';
  END IF;

  INSERT INTO public.offices (slug, name, status, timezone, plan, settings)
  VALUES (
    'qa-isolation-test',
    'QA Isolation Test',
    'active',
    'Africa/Lagos',
    'free',
    jsonb_build_object(
      'qa_office', true,
      'note', 'For Phase 8 cross-office isolation QA only'
    )
  )
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    settings = public.offices.settings || EXCLUDED.settings
  RETURNING id INTO v_test_id;

  IF v_test_id IS NULL THEN
    SELECT id INTO v_test_id FROM public.offices WHERE slug = 'qa-isolation-test';
  END IF;

  -- Clone skills if test office has none
  IF NOT EXISTS (SELECT 1 FROM public.skills WHERE office_id = v_test_id LIMIT 1) THEN
    INSERT INTO public.skills (
      name, overview, theory, practical, tools, outcomes,
      display_order, is_active, is_mandatory, trainers,
      training_plan_pdf_path, office_id
    )
    SELECT
      s.name, s.overview, s.theory, s.practical, s.tools, s.outcomes,
      s.display_order, s.is_active, s.is_mandatory, s.trainers,
      s.training_plan_pdf_path, v_test_id
    FROM public.skills s
    WHERE s.office_id = v_template_id;
    GET DIAGNOSTICS v_skills_cloned = ROW_COUNT;
  END IF;

  -- Clone office content if missing
  IF NOT EXISTS (SELECT 1 FROM public.office_rule_sections WHERE office_id = v_test_id LIMIT 1) THEN
    PERFORM public.clone_office_content(v_template_id, v_test_id);
  END IF;
END;
$$;
