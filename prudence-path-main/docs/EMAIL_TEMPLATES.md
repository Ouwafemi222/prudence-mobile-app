# PRUDENCE PATH — Email Templates

**Last updated**: May 19, 2026

Branded HTML templates live in [`supabase/templates/email/`](../supabase/templates/email/). They match the app design: purple gradient (`#5B52EB` → `#A855F7`), Lato body, EB Garamond headings, glass-style card, rounded corners.

---

## Quick apply (Supabase Dashboard)

1. Open [Authentication → Emails](https://supabase.com/dashboard/project/xpvabdfleomjpytvvjux/auth/templates).
2. For each row below: set **Subject**, paste **Body** from the linked `.html` file (entire file).
3. For **Security** emails, turn **on** the toggle next to each template (as in your screenshots).
4. Save after each template.

---

## Subject lines & source files

### Authentication

| Supabase template | Subject line | HTML file |
|-------------------|--------------|-----------|
| Confirm sign up | `Welcome to PRUDENCE PATH — Confirm your email` | [`confirm-signup.html`](../supabase/templates/email/confirm-signup.html) |
| Invite user | `You're invited to PRUDENCE PATH` | [`invite-user.html`](../supabase/templates/email/invite-user.html) |
| Magic link or OTP | `Your PRUDENCE PATH sign-in link` | [`magic-link.html`](../supabase/templates/email/magic-link.html) |
| Change email address | `Confirm your new email — PRUDENCE PATH` | [`change-email.html`](../supabase/templates/email/change-email.html) |
| Reset password | `Reset your PRUDENCE PATH password` | [`reset-password.html`](../supabase/templates/email/reset-password.html) |
| Reauthentication | `Verify your identity — PRUDENCE PATH` | [`reauthentication.html`](../supabase/templates/email/reauthentication.html) |

### Security notifications

Enable each notification in the dashboard, then paste the matching file.

| Supabase template | Subject line | HTML file |
|-------------------|--------------|-----------|
| Password changed | `Your PRUDENCE PATH password was changed` | [`password-changed.html`](../supabase/templates/email/password-changed.html) |
| Email address changed | `Your PRUDENCE PATH email was updated` | [`email-changed.html`](../supabase/templates/email/email-changed.html) |
| Phone number changed | `Your PRUDENCE PATH phone number was updated` | [`phone-changed.html`](../supabase/templates/email/phone-changed.html) |
| Identity linked | `New sign-in method linked — PRUDENCE PATH` | [`identity-linked.html`](../supabase/templates/email/identity-linked.html) |
| Identity unlinked | `Sign-in method removed — PRUDENCE PATH` | [`identity-unlinked.html`](../supabase/templates/email/identity-unlinked.html) |
| MFA method added | `Two-factor authentication added — PRUDENCE PATH` | [`mfa-added.html`](../supabase/templates/email/mfa-added.html) |
| MFA method removed | `Two-factor authentication removed — PRUDENCE PATH` | [`mfa-removed.html`](../supabase/templates/email/mfa-removed.html) |

---

## Redirect URLs (required)

**Authentication → URL configuration**

- **Site URL**: `https://prudence-path.online`
- **Redirect URLs**:
  - `https://prudence-path.online/`
  - `https://prudence-path.online/auth/reset-password`
  - `https://prudence-path.vercel.app/`
  - `https://prudence-path.vercel.app/auth/reset-password`
  - `http://localhost:5173/` and `http://localhost:5173/auth/reset-password` (dev)

---

## Template variables (Go templates)

| Variable | Use |
|----------|-----|
| `{{ .ConfirmationURL }}` | Primary action link (signup, reset, magic link, etc.) |
| `{{ .Token }}` | 6-digit OTP |
| `{{ .SiteURL }}` | App site URL |
| `{{ .Email }}` | User email |
| `{{ .NewEmail }}` | New email (change-email template) |
| `{{ .OldEmail }}` | Previous email (email-changed notification) |
| `{{ .Phone }}` / `{{ .OldPhone }}` | Phone change notification |
| `{{ .Provider }}` | OAuth provider (identity linked/unlinked) |
| `{{ .FactorType }}` | MFA type (MFA added/removed) |

[Full reference → Supabase email templates docs](https://supabase.com/docs/guides/auth/auth-email-templates)

---

## Resend / custom SMTP

To avoid **“Email rate limit exceeded”** on signup:

1. **Project Settings → Auth → SMTP** — use Resend (`smtp.resend.com`, user `resend`, password = API key).
2. Sender: `noreply@your-verified-domain.com`.

---

## Apply all templates via Management API (optional)

```bash
export SUPABASE_ACCESS_TOKEN="your-token"   # https://supabase.com/dashboard/account/tokens
export PROJECT_REF="xpvabdfleomjpytvvjux"

# Example: patch one template (escape JSON in production scripts)
CONFIRM_HTML=$(cat supabase/templates/email/confirm-signup.html | jq -Rs .)
curl -X PATCH "https://api.supabase.com/v1/projects/$PROJECT_REF/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"mailer_subjects_confirmation\": \"Welcome to PRUDENCE PATH — Confirm your email\", \"mailer_templates_confirmation_content\": $CONFIRM_HTML}"
```

Repeat for each `mailer_subjects_*` / `mailer_templates_*` key. See [Supabase auth config API](https://supabase.com/docs/guides/auth/auth-email-templates#editing-email-templates).

---

## Links

- [Email templates (dashboard)](https://supabase.com/dashboard/project/xpvabdfleomjpytvvjux/auth/templates)
- [URL configuration](https://supabase.com/dashboard/project/xpvabdfleomjpytvvjux/auth/url-configuration)
- [Resend + Supabase SMTP](https://resend.com/docs/send-with-supabase-smtp)
