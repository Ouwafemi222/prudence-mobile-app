# THE PRUDENCE — Supabase email templates

Branded HTML for **Authentication → Emails** in the [Supabase Dashboard](https://supabase.com/dashboard/project/xpvabdfleomjpytvvjux/auth/templates).

## Design tokens (matches `src/index.css`)

| Token | Value |
|-------|--------|
| Primary | `#5B52EB` (hsl 243 75% 58%) |
| Gradient end | `#A855F7` (hsl 270 95% 65%) |
| Background | `#F5F5F5` |
| Card | `#FAFAFA` |
| Text | `#171717` |
| Muted | `#737373` |
| Font | Lato, Arial, sans-serif |
| Radius | 20px (cards), 12px (buttons) |

## How to apply

1. Open each `.html` file below.
2. Copy the **entire** file contents into the matching Supabase template body.
3. Set the **Subject** from the table in `docs/EMAIL_TEMPLATES.md`.
4. For **Security** templates, enable each notification toggle in the dashboard (screenshot section).

## Files

| File | Supabase template |
|------|-------------------|
| `confirm-signup.html` | Confirm sign up |
| `invite-user.html` | Invite user |
| `magic-link.html` | Magic link or OTP |
| `change-email.html` | Change email address |
| `reset-password.html` | Reset password |
| `reauthentication.html` | Reauthentication |
| `password-changed.html` | Password changed |
| `email-changed.html` | Email address changed |
| `phone-changed.html` | Phone number changed |
| `identity-linked.html` | Identity linked |
| `identity-unlinked.html` | Identity unlinked |
| `mfa-added.html` | MFA method added |
| `mfa-removed.html` | MFA method removed |
