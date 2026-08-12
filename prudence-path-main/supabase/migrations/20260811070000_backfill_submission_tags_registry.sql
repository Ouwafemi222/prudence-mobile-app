-- Ensure all historically submitted tags are in the lifetime registry (idempotent)

INSERT INTO public.user_submission_tags (user_id, office_id, tag, first_activity_id, first_used_date)
SELECT DISTINCT ON (da.user_id, da.office_id, lower(trim(t.tag)))
  da.user_id,
  da.office_id,
  lower(trim(t.tag)),
  da.id,
  da.activity_date
FROM public.daily_activities da
CROSS JOIN LATERAL unnest(da.submission_tags) AS t(tag)
WHERE da.submission_tags IS NOT NULL
  AND trim(t.tag) <> ''
ORDER BY da.user_id, da.office_id, lower(trim(t.tag)), da.activity_date ASC
ON CONFLICT (user_id, office_id, tag) DO NOTHING;

-- Repair first_activity_id / first_used_date when missing (e.g. after activity recreate)
UPDATE public.user_submission_tags ust
SET
  first_activity_id = src.activity_id,
  first_used_date = src.activity_date
FROM (
  SELECT DISTINCT ON (da.user_id, da.office_id, lower(trim(t.tag)))
    da.user_id,
    da.office_id,
    lower(trim(t.tag)) AS tag,
    da.id AS activity_id,
    da.activity_date
  FROM public.daily_activities da
  CROSS JOIN LATERAL unnest(da.submission_tags) AS t(tag)
  WHERE da.submission_tags IS NOT NULL
    AND trim(t.tag) <> ''
  ORDER BY da.user_id, da.office_id, lower(trim(t.tag)), da.activity_date ASC
) src
WHERE ust.user_id = src.user_id
  AND ust.office_id = src.office_id
  AND ust.tag = src.tag
  AND (
    ust.first_activity_id IS NULL
    OR ust.first_used_date IS NULL
    OR ust.first_used_date > src.activity_date
  );
