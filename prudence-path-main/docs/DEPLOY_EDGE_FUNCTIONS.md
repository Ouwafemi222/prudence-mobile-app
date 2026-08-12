# Deploy Edge Functions

## CLI error: `unexpected deploy status 401: {"message":"Unauthorized"}`

This means the **Supabase CLI is not logged in** (or your access token expired). It is not a code bug.

### Fix (local CLI)

```bash
supabase login
```

Or use a personal access token from [Supabase Account → Access Tokens](https://supabase.com/dashboard/account/tokens):

```bash
export SUPABASE_ACCESS_TOKEN="sbp_..."
npx supabase functions deploy <function-name> --project-ref xpvabdfleomjpytvvjux
```

Link the project once:

```bash
cd /path/to/prudence-path
supabase link --project-ref xpvabdfleomjpytvvjux
```

## Deploy via Cursor MCP (no CLI login)

Payloads are generated with:

```bash
node scripts/prepare-edge-deploy-payloads.mjs
```

Then deploy each function with the Supabase MCP `deploy_edge_function` tool (includes all `_shared/` files).

## Required Edge Function secrets

In Supabase Dashboard → Edge Functions → Secrets:

| Secret | Purpose |
|--------|---------|
| `RESEND_API_KEY` | Send emails |
| `RESEND_FROM_EMAIL` | From address |
| `RESEND_FROM_NAME` | Display name (e.g. PRUDENCE PATH) |
| `PROJECT_URL` | `https://xpvabdfleomjpytvvjux.supabase.co` |
| `SERVICE_ROLE_KEY` | Service role key |
| `SITE_URL` | `https://prudence-path.online` |
| `ADMIN_EMAIL` | `agboola378@gmail.com` (optional; defaults to this) |

## Functions

| Function | JWT | Purpose |
|----------|-----|---------|
| `notify-admin-signup` | yes | Email admin on new pending signup |
| `notify-admin-approved` | yes | Email admin when member approved |
| `notify-sponsor-signup` | yes | Legacy; app no longer calls at signup |
| `notify-user` | yes | In-app + optional email notifications |
| `prepare-signup` | yes | Clear stale unconfirmed auth users |
| `delete-user` | yes | Super admin user deletion |
| `daily-reminder-notifications` | no | Cron: daily report reminder |
| `missed-submission-alerts` | no | Cron: missed yesterday |
| `weekly-summary-notifications` | no | Cron: weekly summary |
