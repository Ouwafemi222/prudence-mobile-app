# Edge Functions — secrets & deploy

## Add these secrets (Dashboard → Edge Functions → Secrets)

| Name | Required |
|------|----------|
| `RESEND_API_KEY` | Yes |
| `RESEND_FROM_EMAIL` | Yes |
| `RESEND_FROM_NAME` | No (defaults to `THE PRUDENCE`) |
| `SITE_URL` | Yes — use `https://prudence-path.online` (no trailing slash) |
| `PROJECT_URL` | Yes (your Supabase API URL) |
| `SERVICE_ROLE_KEY` | Yes (service role JWT) |

`RESEND_API_KEY` is the same key used for Supabase Auth custom SMTP.

## Deploy

```bash
supabase functions deploy notify-user
supabase functions deploy daily-reminder-notifications --no-verify-jwt
supabase functions deploy missed-submission-alerts --no-verify-jwt
supabase functions deploy weekly-summary-notifications --no-verify-jwt
supabase functions deploy delete-user
```

## `notify-user`

Called from the React app when trainers/admins notify members. Creates a row in `notifications` and sends email via Resend.
