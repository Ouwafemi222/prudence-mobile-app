-- Align submission lock error message with 11:59 PM WAT deadline (logic already correct)

CREATE OR REPLACE FUNCTION public.check_submission_lock()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF public.is_submission_locked(NEW.activity_date) THEN
    RAISE EXCEPTION 'Submissions are locked after 11:59 PM (WAT). The deadline for % has passed.', NEW.activity_date;
  END IF;
  RETURN NEW;
END;
$$;

-- Update office rules text cloned from old 10 PM copy
UPDATE public.office_rule_sections rs
SET items = (
  SELECT array_agg(
    CASE
      WHEN elem ILIKE '%10:00 PM%' OR elem ILIKE '%10 PM%'
        THEN replace(replace(elem, '10:00 PM', '11:59 PM'), '10 PM', '11:59 PM')
      ELSE elem
    END
    ORDER BY ord
  )
  FROM unnest(rs.items) WITH ORDINALITY AS t(elem, ord)
)
WHERE EXISTS (
  SELECT 1 FROM unnest(rs.items) AS elem
  WHERE elem ILIKE '%10:00 PM%' OR elem ILIKE '%10 PM%'
);
