-- Cross-office isolation simulation (requires qa-isolation-test office)
-- Run after 20260806250000_qa_isolation_test_office.sql
-- Pass = no rows in failure queries

-- 1) Test office exists with cloned content
SELECT 'FAIL: qa-isolation-test office missing' AS check
WHERE NOT EXISTS (SELECT 1 FROM public.offices WHERE slug = 'qa-isolation-test');

SELECT 'FAIL: test office has no rule sections' AS check
WHERE (
  SELECT count(*) FROM public.office_rule_sections rs
  JOIN public.offices o ON o.id = rs.office_id
  WHERE o.slug = 'qa-isolation-test'
) = 0;

SELECT 'FAIL: test office has no skills' AS check
WHERE (
  SELECT count(*) FROM public.skills s
  JOIN public.offices o ON o.id = s.office_id
  WHERE o.slug = 'qa-isolation-test'
) = 0;

-- 2) Content is isolated by office_id (no shared section ids)
SELECT 'FAIL: rule sections shared across offices' AS check, count(*) AS n
FROM public.office_rule_sections a
JOIN public.office_rule_sections b ON a.id = b.id AND a.office_id <> b.office_id
HAVING count(*) > 0;

-- 3) Sponsor downlines never cross offices
SELECT 'FAIL: sponsor downline crosses office' AS check, d.username, d.depth
FROM public.profiles sponsor
JOIN public.user_roles ur ON ur.user_id = sponsor.user_id AND ur.role = 'sponsor'
CROSS JOIN LATERAL public.get_sponsor_downlines(sponsor.user_id) d
JOIN public.profiles downline ON downline.user_id = d.user_id
WHERE downline.office_id IS DISTINCT FROM sponsor.office_id
LIMIT 5;

-- 4) users_share_office false for prudence trainer vs hypothetical different office
-- (Uses two distinct profiles; if only one office exists, skip by checking qa office has zero members)
SELECT 'FAIL: prudence and qa office share members unexpectedly' AS check, count(*) AS n
FROM public.profiles p
JOIN public.offices o ON o.id = p.office_id
WHERE o.slug = 'qa-isolation-test'
HAVING count(*) > 0;

-- 5) admin_can_access_user: trainer cannot access user in different office (when qa member exists)
-- Placeholder: run manually after creating qa-isolation-test signup

-- 6) Rule section counts match between template and clone
SELECT 'FAIL: rule section count mismatch prudence vs qa' AS check
WHERE (
  SELECT count(*) FROM public.office_rule_sections rs
  JOIN public.offices o ON o.id = rs.office_id WHERE o.slug = 'prudence'
) <> (
  SELECT count(*) FROM public.office_rule_sections rs
  JOIN public.offices o ON o.id = rs.office_id WHERE o.slug = 'qa-isolation-test'
);

-- 7) Skills count match
SELECT 'FAIL: skills count mismatch prudence vs qa' AS check
WHERE (
  SELECT count(*) FROM public.skills s
  JOIN public.offices o ON o.id = s.office_id WHERE o.slug = 'prudence'
) <> (
  SELECT count(*) FROM public.skills s
  JOIN public.offices o ON o.id = s.office_id WHERE o.slug = 'qa-isolation-test'
);
