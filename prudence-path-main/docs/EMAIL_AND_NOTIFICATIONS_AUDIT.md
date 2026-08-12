# Email & notifications audit — PRUDENCE PATH

**Last updated**: May 19, 2026

This document lists everything that depends on **Resend** (via Supabase SMTP or Edge Functions) vs what only uses **in-app** `notifications` today.

---

## Legend

| Status | Meaning |
|--------|---------|
| ✅ Resend via Supabase Auth SMTP | Works once SMTP + templates are configured in dashboard |
| 🟡 In-app only | Writes to `notifications` table; **no email sent** |
| ❌ Not implemented | Needs Edge Function + `RESEND_API_KEY` |
| 🔧 Dashboard only | No app code; configure in Supabase |

---

## A. Supabase Auth emails (Resend SMTP — you configured this)

These are triggered by `supabase.auth` from the frontend. **No `RESEND_API_KEY` in app code** — Supabase sends via your custom SMTP.

| Flow | Code location | Supabase / Resend |
|------|---------------|-------------------|
| **Sign up + confirm email** | `AuthContext.signUp` → `Auth.tsx` | Template: Confirm sign up |
| **Sign in (password)** | `AuthContext.signIn` | No email (unless MFA) |
| **Forgot password** | `AuthContext.resetPasswordForEmail` → `Auth.tsx` | Template: Reset password |
| **Set new password (link)** | `ResetPassword.tsx` → `auth.updateUser({ password })` | Uses recovery link from email |
| **Email change (auth)** | Not wired in Profile* | Template: Change email + security “email changed” |
| **Magic link / OTP** | Not used in UI | Template: Magic link (if enabled in providers) |
| **Invite user (auth)** | Not used | Template: Invite user |
| **Reauthentication** | Not used | Template: Reauthentication |
| **Password changed** | `Profile.tsx` → `auth.updateUser({ password })` | Security: Password changed (enable toggle) |
| **MFA / identity / phone** | Not used in UI | Security templates (enable toggles) |

\* `Profile.tsx` updates `profiles.email` only — it does **not** call `auth.updateUser({ email })`, so **auth email-change flow is not triggered** from the app today.

### Dashboard checklist (Auth + Resend)

- [ ] **Auth → SMTP**: Resend (`smtp.resend.com`, user `resend`, password = API key)
- [ ] **Auth → URL configuration**: Site URL + redirect URLs (`/`, `/auth/reset-password`)
- [ ] **Auth → Emails**: Paste HTML from `supabase/templates/email/*.html`
- [ ] **Security notifications**: Enable toggles (password changed, etc.)

---

## B. Edge Functions (scheduled / admin)

Deployed on project `xpvabdfleomjpytvvjux`. Source now lives in `supabase/functions/` (secrets, not hardcoded keys).

| Function | JWT | What it does | Email? |
|----------|-----|--------------|--------|
| `notify-user` | On | In-app notification + Resend email (called from app) | ✅ Email + in-app |
| `daily-reminder-notifications` | Off | Reminder for missing today's submission | ✅ Email + in-app |
| `missed-submission-alerts` | Off | Alert for yesterday's missed submission | ✅ Email + in-app |
| `weekly-summary-notifications` | Off | Weekly summary | ✅ Email + in-app |
| `delete-user` | On | Super admin deletes auth user | No email |

**Secrets required** (Supabase Dashboard → **Project Settings → Edge Functions → Secrets**):

| Secret name | Required | Example | Purpose |
|-------------|----------|---------|---------|
| `RESEND_API_KEY` | **Yes** | `re_...` | Resend API (same key as SMTP password) |
| `RESEND_FROM_EMAIL` | **Yes** | `noreply@yourdomain.com` | From address (verified domain) |
| `RESEND_FROM_NAME` | No | `PRUDENCE PATH` | Display name in inbox |
| `SITE_URL` | **Yes** | `https://prudence-path.online` | CTA links in notification emails |
| `PROJECT_URL` | **Yes** | `https://xpvabdfleomjpytvvjux.supabase.co` | Supabase API URL (your secret name) |
| `SERVICE_ROLE_KEY` | **Yes** | `eyJ...` (service role) | Service role JWT (your secret name) |

See `supabase/functions/.env.example` for local development.

**Cron**: Production may have `setup_notification_cron_jobs` (pg_cron) calling these URLs — migration exists on remote DB but not in local `supabase/migrations/`. Verify in Dashboard → Database → Extensions / Cron.

**Security**: Rotate service role key if it was ever committed in `supabase/backups/.../daily-reminder-notifications/index.ts` (old hardcoded JWT).

---

## C. In-app notifications only (no Resend yet)

| Event | File | Notification |
|-------|------|--------------|
| Member approved | `Teams.tsx` → `notify-user` | Account Approved |
| Member rejected | `Teams.tsx` → `notify-user` | Account Rejected |
| Member deactivated | `Teams.tsx` → `notify-user` | Account Deactivated |
| Trainer weekly feedback | `WeeklyReports.tsx` → `notify-user` | Weekly Report Feedback |
| Submission approved/rejected | `Submissions.tsx` → `notify-user` | Verification |
| Daily reminder | Edge `daily-reminder-notifications` | Daily Activity Reminder |
| Missed submission | Edge `missed-submission-alerts` | Missed Daily Submission |
| Weekly summary | Edge `weekly-summary-notifications` | Your Weekly Summary |

---

## D. Explicitly not implemented (needs Resend Edge Function)

| Feature | UI hint | Suggested template |
|---------|---------|-------------------|
| Team invite email | `Teams.tsx`: “Invitation emails are not sent automatically yet” | `invite-member` |
| Approval / rejection email | After approve/reject in `Teams.tsx` | `account-approved`, `account-rejected` |
| Submission verified / rejected email | `Submissions.tsx` | `submission-approved`, `submission-rejected` |
| Email preference toggles | `Profile.tsx` notifications tab | Stored nowhere; not enforced |
| Inbound mail (support@) | N/A | `resend-inbound` webhook + DB table |

---

## E. Environment variables (summary)

| Variable | Where | Used for |
|----------|--------|----------|
| Resend API key as SMTP password | Supabase Auth SMTP | All auth + security emails |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` | `.env` (frontend) | Client only — never Resend |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Function secrets | Cron notification functions |
| `RESEND_API_KEY` | Edge secrets (future) | App transactional `send-email` |
| `RESEND_FROM_EMAIL` | Edge secrets (future) | From address for app emails |

---

## F. Deploy Edge Functions

After adding secrets in the dashboard:

```bash
supabase secrets set RESEND_API_KEY=re_xxx RESEND_FROM_EMAIL=noreply@yourdomain.com RESEND_FROM_NAME="PRUDENCE PATH" SITE_URL=https://prudence-path.online

supabase functions deploy notify-user
supabase functions deploy daily-reminder-notifications --no-verify-jwt
supabase functions deploy missed-submission-alerts --no-verify-jwt
supabase functions deploy weekly-summary-notifications --no-verify-jwt
supabase functions deploy delete-user
```

---

## G. Remaining (optional)

- Team invite **email** (still copy-link only in UI)
- Profile notification preference toggles (persist + respect before send)
- Inbound mail webhook (`support@`)

See also: [`EMAIL_TEMPLATES.md`](./EMAIL_TEMPLATES.md), [`EDGE_FUNCTIONS.md`](./EDGE_FUNCTIONS.md), [`supabase/functions/.env.example`](../supabase/functions/.env.example).
