# Supabase Local Backup - 20260324-132245

This folder contains a local snapshot exported via Supabase MCP tools.

## Included

- `inventory/migrations.json`: Migration versions currently registered in Supabase.
- `inventory/extensions.json`: Available/installed Postgres extensions.
- `inventory/tables_verbose.json`: Table metadata snapshot (schemas, columns, PK/FK, RLS flags, row estimates).
- `inventory/rls_policies.json`: RLS policy definitions from `pg_policies`.
- `inventory/db_functions.json`: SQL function definitions from `public`, `auth`, and `storage`.
- `inventory/triggers.json`: Trigger definitions from `public`, `auth`, and `storage`.
- `edge-functions/manifest.json`: Edge function metadata.
- `edge-functions/<slug>/index.ts`: Edge function source code for each deployed function.

## Important

- This backup includes sensitive content (for example service-role credentials embedded in some edge functions).
- Keep this directory private and never commit it to a public repository.
- This is a metadata/code snapshot. It does not include table row data dumps.
