-- QA isolation test users for cross-office RPC/RLS manual verification
-- Emails: @test.prudence-path.local (not real inboxes)
-- Password (if needed for browser login): QA-Test-Only-2026!

DO $$
DECLARE
  v_qa_office_id uuid;
  v_trainer_id uuid := 'a1000001-0001-4001-8001-000000000001';
  v_member_id uuid := 'a1000002-0002-4002-8002-000000000002';
  v_instance_id uuid := '00000000-0000-0000-0000-000000000000';
  v_pw text := crypt('QA-Test-Only-2026!', gen_salt('bf'));
BEGIN
  SELECT id INTO v_qa_office_id FROM public.offices WHERE slug = 'qa-isolation-test';
  IF v_qa_office_id IS NULL THEN
    RAISE EXCEPTION 'qa-isolation-test office not found — run 20260806250000 first';
  END IF;

  -- Trainer
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_trainer_id) THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_sso_user
    ) VALUES (
      v_instance_id, v_trainer_id, 'authenticated', 'authenticated',
      'qa-trainer@test.prudence-path.local', v_pw,
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object(
        'full_name', 'QA Trainer',
        'username', 'qa_trainer',
        'office_slug', 'qa-isolation-test'
      ),
      false
    );
  END IF;

  -- Member
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_member_id) THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_sso_user
    ) VALUES (
      v_instance_id, v_member_id, 'authenticated', 'authenticated',
      'qa-member@test.prudence-path.local', v_pw,
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object(
        'full_name', 'QA Member',
        'username', 'qa_member',
        'office_slug', 'qa-isolation-test'
      ),
      false
    );
  END IF;

  -- Ensure profiles exist (trigger may have created them)
  INSERT INTO public.profiles (user_id, full_name, username, email, office_id, approval_status)
  VALUES
    (v_trainer_id, 'QA Trainer', 'qa_trainer', 'qa-trainer@test.prudence-path.local', v_qa_office_id, 'approved'),
    (v_member_id, 'QA Member', 'qa_member', 'qa-member@test.prudence-path.local', v_qa_office_id, 'approved')
  ON CONFLICT (user_id) DO UPDATE SET
    office_id = EXCLUDED.office_id,
    approval_status = 'approved';

  -- Roles (trigger may insert member; replace with intended roles)
  DELETE FROM public.user_roles WHERE user_id IN (v_trainer_id, v_member_id);

  INSERT INTO public.user_roles (user_id, role, office_id)
  VALUES
    (v_trainer_id, 'trainer', v_qa_office_id),
    (v_member_id, 'member', v_qa_office_id);
END;
$$;
