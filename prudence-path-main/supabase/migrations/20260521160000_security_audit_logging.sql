-- Security audit logging: pgAudit (platform Postgres logs) + append-only audit.event_log (row-level).

CREATE SCHEMA IF NOT EXISTS audit;

CREATE TABLE IF NOT EXISTS audit.event_log (
  id bigserial PRIMARY KEY,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  schema_name text NOT NULL,
  table_name text NOT NULL,
  operation text NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  row_pk jsonb,
  actor_user_id uuid,
  actor_username text,
  actor_email text,
  db_role text NOT NULL,
  jwt_role text,
  client_ip inet,
  request_path text,
  old_data jsonb,
  new_data jsonb,
  changed_columns text[]
);

COMMENT ON TABLE audit.event_log IS
  'Append-only row change log. App users identified via auth.uid(); SQL Editor shows db_role=postgres.';

CREATE INDEX IF NOT EXISTS idx_audit_event_log_occurred_at
  ON audit.event_log (occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_event_log_table
  ON audit.event_log (schema_name, table_name, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_event_log_actor
  ON audit.event_log (actor_user_id, occurred_at DESC)
  WHERE actor_user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION audit.deny_event_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = audit
AS $$
BEGIN
  RAISE EXCEPTION 'audit.event_log is append-only and cannot be modified or deleted';
END;
$$;

DROP TRIGGER IF EXISTS trg_event_log_immutable ON audit.event_log;
CREATE TRIGGER trg_event_log_immutable
  BEFORE UPDATE OR DELETE ON audit.event_log
  FOR EACH ROW
  EXECUTE FUNCTION audit.deny_event_log_mutation();

CREATE OR REPLACE FUNCTION audit.log_row_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, audit
AS $$
DECLARE
  v_actor uuid;
  v_username text;
  v_email text;
  v_jwt jsonb;
  v_jwt_role text;
  v_request_path text;
  v_old jsonb;
  v_new jsonb;
  v_pk jsonb;
  v_changed text[] := ARRAY[]::text[];
  v_key text;
BEGIN
  v_actor := auth.uid();

  IF v_actor IS NOT NULL THEN
    SELECT p.username, p.email
    INTO v_username, v_email
    FROM public.profiles p
    WHERE p.user_id = v_actor
    LIMIT 1;
  END IF;

  BEGIN
    v_jwt := NULLIF(current_setting('request.jwt.claims', true), '')::jsonb;
  EXCEPTION
    WHEN OTHERS THEN
      v_jwt := NULL;
  END;

  IF v_jwt IS NOT NULL THEN
    v_jwt_role := v_jwt->>'role';
  END IF;

  BEGIN
    v_request_path := NULLIF(current_setting('request.path', true), '');
  EXCEPTION
    WHEN OTHERS THEN
      v_request_path := NULL;
  END;

  IF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD);
    v_pk := jsonb_strip_nulls(jsonb_build_object('id', OLD.id));
  ELSIF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_pk := jsonb_strip_nulls(jsonb_build_object('id', NEW.id));

    FOR v_key IN SELECT jsonb_object_keys(v_new)
    LOOP
      IF v_old->v_key IS DISTINCT FROM v_new->v_key THEN
        v_changed := array_append(v_changed, v_key);
      END IF;
    END LOOP;
  ELSE
    v_new := to_jsonb(NEW);
    v_pk := jsonb_strip_nulls(jsonb_build_object('id', NEW.id));
  END IF;

  INSERT INTO audit.event_log (
    schema_name,
    table_name,
    operation,
    row_pk,
    actor_user_id,
    actor_username,
    actor_email,
    db_role,
    jwt_role,
    client_ip,
    request_path,
    old_data,
    new_data,
    changed_columns
  ) VALUES (
    TG_TABLE_SCHEMA,
    TG_TABLE_NAME,
    TG_OP,
    v_pk,
    v_actor,
    v_username,
    v_email,
    session_user,
    v_jwt_role,
    inet_client_addr(),
    v_request_path,
    v_old,
    v_new,
    CASE WHEN TG_OP = 'UPDATE' THEN v_changed ELSE NULL END
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

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

ALTER TABLE audit.event_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can read audit log" ON audit.event_log;
CREATE POLICY "Super admins can read audit log"
  ON audit.event_log
  FOR SELECT
  TO authenticated
  USING (public.user_is_super_admin(auth.uid()));

REVOKE ALL ON TABLE audit.event_log FROM PUBLIC;
REVOKE ALL ON TABLE audit.event_log FROM anon, authenticated, service_role;
GRANT USAGE ON SCHEMA audit TO authenticated;
GRANT SELECT ON audit.event_log TO authenticated;

REVOKE ALL ON SEQUENCE audit.event_log_id_seq FROM PUBLIC;
REVOKE ALL ON SEQUENCE audit.event_log_id_seq FROM anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_audit_events(
  p_table_name text DEFAULT NULL,
  p_actor_user_id uuid DEFAULT NULL,
  p_operation text DEFAULT NULL,
  p_since timestamptz DEFAULT NULL,
  p_limit integer DEFAULT 100
)
RETURNS SETOF audit.event_log
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, audit
AS $$
BEGIN
  IF NOT public.user_is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only super admins can view audit events';
  END IF;

  IF p_limit IS NULL OR p_limit < 1 THEN
    p_limit := 100;
  ELSIF p_limit > 500 THEN
    p_limit := 500;
  END IF;

  RETURN QUERY
  SELECT e.*
  FROM audit.event_log e
  WHERE (p_table_name IS NULL OR e.table_name = p_table_name)
    AND (p_actor_user_id IS NULL OR e.actor_user_id = p_actor_user_id)
    AND (p_operation IS NULL OR e.operation = upper(p_operation))
    AND (p_since IS NULL OR e.occurred_at >= p_since)
  ORDER BY e.occurred_at DESC
  LIMIT p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.get_audit_events(text, uuid, text, timestamptz, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_audit_events(text, uuid, text, timestamptz, integer) TO authenticated;

-- pgAudit: platform Postgres logs (Dashboard > Logs > Postgres Logs).
-- Catches SQL Editor (postgres role) and API writes (authenticator chain).
CREATE EXTENSION IF NOT EXISTS pgaudit;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'prudence_audit_object') THEN
    CREATE ROLE prudence_audit_object NOINHERIT;
  END IF;
END
$$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_activities TO prudence_audit_object;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO prudence_audit_object;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO prudence_audit_object;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_todos TO prudence_audit_object;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_comments TO prudence_audit_object;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.monthly_goals TO prudence_audit_object;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_reports TO prudence_audit_object;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.groups TO prudence_audit_object;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suggestions TO prudence_audit_object;
GRANT SELECT, DELETE ON auth.users TO prudence_audit_object;

ALTER ROLE postgres SET pgaudit.log TO 'write, ddl';
ALTER ROLE postgres SET pgaudit.role TO 'prudence_audit_object';
ALTER ROLE authenticator SET pgaudit.log TO 'write';
