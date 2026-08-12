-- Phase 8: automated multi-tenant isolation checks (run as postgres / service_role)
-- Pass = no rows returned from each SELECT; any row = investigate.

-- 1) Internal RPCs must not be callable by authenticated
SELECT 'FAIL: clone_office_content granted to authenticated' AS check
WHERE has_function_privilege('authenticated', 'public.clone_office_content(uuid, uuid)', 'EXECUTE');

SELECT 'FAIL: generate_weekly_report granted to authenticated' AS check
WHERE has_function_privilege('authenticated', 'public.generate_weekly_report(uuid, date)', 'EXECUTE');

SELECT 'FAIL: calculate_monthly_actuals granted to authenticated' AS check
WHERE has_function_privilege('authenticated', 'public.calculate_monthly_actuals(uuid, date)', 'EXECUTE');

-- 2) Public wrappers must remain callable
SELECT 'FAIL: get_or_generate_monthly_goal not granted to authenticated' AS check
WHERE NOT has_function_privilege('authenticated', 'public.get_or_generate_monthly_goal(uuid, date)', 'EXECUTE');

-- 3) Signup helpers
SELECT 'FAIL: is_sponsor_in_office not granted to anon' AS check
WHERE NOT has_function_privilege('anon', 'public.is_sponsor_in_office(text, uuid)', 'EXECUTE');

-- 4) All profiles have office_id
SELECT 'FAIL: profiles with null office_id' AS check, count(*) AS n
FROM public.profiles WHERE office_id IS NULL
HAVING count(*) > 0;

-- 5) Tenant tables: no orphan office_id
SELECT 'FAIL: daily_activities orphan office_id' AS check, count(*) AS n
FROM public.daily_activities da
LEFT JOIN public.profiles p ON p.user_id = da.user_id
WHERE da.office_id IS DISTINCT FROM p.office_id
HAVING count(*) > 0;

-- 6) handle_new_user requires office slug (function body check)
SELECT 'FAIL: handle_new_user missing office invite guard' AS check
WHERE NOT EXISTS (
  SELECT 1 FROM pg_proc
  WHERE proname = 'handle_new_user'
    AND pg_get_functiondef(oid) ILIKE '%Office invite required%'
);

-- 7) admin_can_access_user exists
SELECT 'FAIL: admin_can_access_user missing' AS check
WHERE NOT EXISTS (
  SELECT 1 FROM pg_proc WHERE proname = 'admin_can_access_user'
);

-- 8) is_todo_date_editable allows future dates
SELECT 'FAIL: is_todo_date_editable missing future date support' AS check
WHERE NOT EXISTS (
  SELECT 1 FROM pg_proc
  WHERE proname = 'is_todo_date_editable'
    AND pg_get_functiondef(oid) ILIKE '%WHEN p_todo_date >%'
);
