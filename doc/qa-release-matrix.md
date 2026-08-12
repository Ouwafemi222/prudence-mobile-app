# QA and release matrix — THE PRUDENCE mobile

Use this before store submission. Test on **iOS and Android**, on **two offices**, for every role.

Realtime stays off (`REALTIME_SYNC_ENABLED` is not wired). Section-level verification UI stays off to match web.

## Role × office

| Role | Office A | Office B | Must pass |
|------|----------|----------|-----------|
| member | signup `?office=slug`, email confirm, pending vs rejected | cannot see other office rules/skills | Today-only todo/activity; tags unique; proof SHA blocked; monthly window lock |
| sponsor | Sponsor dashboard visible even if empty | downlines scoped | Weekly/monthly drill-down + review dialog |
| pro | comment on submissions, cannot verify | group todos for assigned group | No verify buttons |
| trainer | Teams approve + email, Submissions review, Group weekly | groups with `trainer_ids` | Switching members does not show stale todo history |
| office_admin | Office Admin: rename, CMS, pending status only | cannot provision offices | Signup link copies for own office |
| super_admin | All offices, applications, `provision_office_from_application` | switch office picker | Delete user + provision + copy signup link |

## Daily lock

- Yesterday’s todo and activity are read-only.
- Today locks at 11:59 PM WAT (`is_today_submission_locked`).
- Reused lifetime tag blocked; exact duplicate proof blocked.

## Store / release hardening

- [ ] Crash reporting (Sentry or EAS) configured for production
- [ ] Privacy policy URL set in store listing and `app.json`
- [ ] EAS production secrets: `EXPO_PUBLIC_SUPABASE_URL`, anon/publishable key, `EXPO_PUBLIC_SITE_URL=https://prudence-path.online`, `EXPO_PUBLIC_PERCEPTUAL_DEDUP=true`
- [ ] Confirm env matches the website Supabase project
- [ ] Marketing paths (`/`, `/about`, `/faq`, `/apply`, `/pricing`) open in system browser
- [ ] Deep links: `prudence://` recovery + email confirm
