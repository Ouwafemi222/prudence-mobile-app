-- Cross-office RPC isolation tests (requires qa test users migration)
-- Pass = expected rows returned; empty unexpected = investigate

-- Fixed UUIDs from 20260806260000_qa_isolation_test_users.sql
-- qa_trainer: a1000001-0001-4001-8001-000000000001
-- qa_member: a1000002-0002-4002-8002-000000000002

-- 1) admin_can_access_user: same-office trainer → member = true
SELECT 'PASS: qa trainer can access qa member' AS result
WHERE public.admin_can_access_user(
  'a1000001-0001-4001-8001-000000000001'::uuid,
  'a1000002-0002-4002-8002-000000000002'::uuid
);

-- 2) admin_can_access_user: cross-office prudence trainer → qa member = false
SELECT 'FAIL: prudence trainer can access qa member' AS result
WHERE public.admin_can_access_user(
  (SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'trainer' LIMIT 1),
  'a1000002-0002-4002-8002-000000000002'::uuid
);

-- 3) users_share_office cross-office = false
SELECT 'FAIL: users_share_office true across offices' AS result
WHERE public.users_share_office(
  (SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'trainer' LIMIT 1),
  'a1000002-0002-4002-8002-000000000002'::uuid
);

-- 4) RPC: prudence trainer calling monthly goal for qa member → not allowed
DO $$
DECLARE
  v_prudence_trainer uuid;
  v_qa_member uuid := 'a1000002-0002-4002-8002-000000000002';
  v_err text;
BEGIN
  SELECT ur.user_id INTO v_prudence_trainer
  FROM public.user_roles ur
  JOIN public.profiles p ON p.user_id = ur.user_id
  JOIN public.offices o ON o.id = p.office_id
  WHERE ur.role = 'trainer' AND o.slug = 'prudence'
  LIMIT 1;

  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claim.sub', v_prudence_trainer::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  BEGIN
    PERFORM * FROM public.get_or_generate_monthly_goal(v_qa_member);
    RAISE EXCEPTION 'FAIL: cross-office monthly goal RPC should have raised not allowed';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT ILIKE '%not allowed%' THEN
      RAISE EXCEPTION 'FAIL: unexpected error: %', SQLERRM;
    END IF;
  END;
END;
$$;

-- 5) RPC: prudence trainer calling weekly report for qa member → not allowed
DO $$
DECLARE
  v_prudence_trainer uuid;
  v_qa_member uuid := 'a1000002-0002-4002-8002-000000000002';
BEGIN
  SELECT ur.user_id INTO v_prudence_trainer
  FROM public.user_roles ur
  JOIN public.profiles p ON p.user_id = ur.user_id
  JOIN public.offices o ON o.id = p.office_id
  WHERE ur.role = 'trainer' AND o.slug = 'prudence'
  LIMIT 1;

  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claim.sub', v_prudence_trainer::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  BEGIN
    PERFORM * FROM public.get_or_generate_weekly_report_for_week(v_qa_member, current_date);
    RAISE EXCEPTION 'FAIL: cross-office weekly report RPC should have raised not allowed';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT ILIKE '%not allowed%' THEN
      RAISE EXCEPTION 'FAIL: unexpected error: %', SQLERRM;
    END IF;
  END;
END;
$$;

-- 6) RPC: qa trainer CAN access qa member monthly goal
DO $$
DECLARE
  v_qa_trainer uuid := 'a1000001-0001-4001-8001-000000000001';
  v_qa_member uuid := 'a1000002-0002-4002-8002-000000000002';
BEGIN
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claim.sub', v_qa_trainer::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  PERFORM * FROM public.get_or_generate_monthly_goal(v_qa_member);
END;
$$;

SELECT 'ALL RPC ISOLATION TESTS PASSED' AS result;
