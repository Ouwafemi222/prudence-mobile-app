# Deploy checklist (remaining backend steps)

Run from the project root after pulling latest code:

```bash
npx supabase db push
npx supabase functions deploy prepare-signup --no-verify-jwt
npx supabase functions deploy notify-sponsor-signup
npx supabase functions deploy notify-user
npx supabase functions deploy delete-user
npx supabase functions deploy daily-reminder-notifications --no-verify-jwt
npx supabase functions deploy missed-submission-alerts --no-verify-jwt
npx supabase functions deploy weekly-summary-notifications --no-verify-jwt
```

**MCP note:** If `prudence-supabase` MCP returns `Unauthorized`, set `SUPABASE_ACCESS_TOKEN` in Cursor MCP config. Edge functions can still be deployed with the Supabase CLI when linked to the project (as above).

## Auth email templates

Supabase does not expose auth email templates via MCP or `functions deploy`. Copy HTML from `supabase/templates/email/` into **Authentication → Email Templates** in the Supabase Dashboard. See `supabase/templates/email/README.md`.

## Signup

- Enable **Confirm email** in Supabase Auth settings.
- `prepare-signup` removes stale unconfirmed users so email/username can be reused after link expiry.
- Profiles are created only after email confirmation (migration `20260519120000_signup_verify_and_platform_improvements.sql`).

## Weekly consistency (mobile + web)

`daily_activities` changes trigger `generate_weekly_report` for that week. Ensure migration is applied on production.
