-- Fix audit trigger names (regclass cast omits schema prefix).

CREATE OR REPLACE FUNCTION audit.attach_row_audit_trigger(p_table regclass)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = audit, public
AS $$
DECLARE
  v_schema text;
  v_table text;
  v_trigger_name text;
BEGIN
  SELECT n.nspname, c.relname
  INTO v_schema, v_table
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.oid = p_table;

  v_trigger_name := 'trg_audit_' || v_table;

  EXECUTE format('DROP TRIGGER IF EXISTS %I ON %s', v_trigger_name, p_table);
  EXECUTE format(
    'CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON %s FOR EACH ROW EXECUTE FUNCTION audit.log_row_change()',
    v_trigger_name,
    p_table
  );
END;
$$;

SELECT audit.attach_row_audit_trigger('public.daily_activities'::regclass);
SELECT audit.attach_row_audit_trigger('public.profiles'::regclass);
SELECT audit.attach_row_audit_trigger('public.user_roles'::regclass);
SELECT audit.attach_row_audit_trigger('public.daily_todos'::regclass);
SELECT audit.attach_row_audit_trigger('public.activity_comments'::regclass);
SELECT audit.attach_row_audit_trigger('public.monthly_goals'::regclass);
SELECT audit.attach_row_audit_trigger('public.weekly_reports'::regclass);
SELECT audit.attach_row_audit_trigger('public.groups'::regclass);
SELECT audit.attach_row_audit_trigger('public.suggestions'::regclass);

DROP TRIGGER IF EXISTS trg_audit_ ON public.activity_comments;
DROP TRIGGER IF EXISTS trg_audit_ ON public.daily_activities;
DROP TRIGGER IF EXISTS trg_audit_ ON public.daily_todos;
DROP TRIGGER IF EXISTS trg_audit_ ON public.groups;
DROP TRIGGER IF EXISTS trg_audit_ ON public.monthly_goals;
DROP TRIGGER IF EXISTS trg_audit_ ON public.profiles;
DROP TRIGGER IF EXISTS trg_audit_ ON public.user_roles;
DROP TRIGGER IF EXISTS trg_audit_ ON public.weekly_reports;
DROP TRIGGER IF EXISTS trg_audit_ ON public.suggestions;
