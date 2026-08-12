# THE PRUDENCE Mobile — Website Feature Parity Plan

**Source of truth:** `prudence-path-main` (https://prudence-path.online)  
**Mobile:** this Expo app (upgrade in place — do not start over)  
**Backend:** same Supabase project. No mobile-only tables. No forked schema.  
**Approach:** keep push, biometrics, suggestion outbox, and the tab/stack shell. Rewrite screens and rules to match the website.

The previous “~97% complete” tracker measured an older single-office website. The website is now multi-tenant with stricter daily rules and full trainer/admin workflows. Use this document as the living checklist.

---

## Status

| Phase | Focus | Status |
|-------|--------|--------|
| 0 | Living plan + env | Done |
| 1 | Foundation: auth, office, lib, theme, deep links | Done |
| 2 | Member core: Daily Todo + Daily Activity + Dashboard | Done |
| 3 | Reports + account | Done |
| 4 | Office-scoped resources | Done |
| 5 | Trainer: Teams, Submissions, Group Weekly, Sponsor | Done |
| 6 | Admin + office owner + marketing browser links | Done |
| 7 | QA + store hardening | Done — see `doc/qa-release-matrix.md` |

---

## Keep vs change

| Keep (mobile extras) | Change to match website | Do not rebuild natively |
|----------------------|-------------------------|-------------------------|
| Expo push + local reminders | Theme → `#5B52EB`, Lato, glass, light default | Marketing: `/`, `/features`, `/about`, `/how-it-works`, `/faq`, `/apply`, `/pricing`, `/demo` |
| Biometric login | Auth, roles, office tenancy | Open those URLs with `expo-web-browser` |
| Suggestion offline outbox | Daily todo/activity rules | |
| Tab + stack navigation | Teams, submissions, admin, DB resources | |

---

## Website upgrades the app did not have

1. **Multi-tenant offices** — `office_id`, signup `?office=slug`, per-office usernames/sponsors, `tenantScope`
2. **Roles / auth** — `office_admin`, email confirm, `prepare-signup`, rejected vs pending, password-reset deep link
3. **Brand** — light `#5B52EB` / Lato / glass (mobile was custom neo-mint)
4. **Shared `src/lib` rules** — never ported (todo lock, tags, proof SHA + dHash, monthly window, office CMS, notify/edge helpers)
5. **Daily Todo** — today-only, 11:59 PM WAT, `daily_todo_logs`, policy banner
6. **Daily Activity** — tags, proof dedup, Fiverr 20% UI, full trainer section, dedicated skills, no past-date edits, weekly pages target 7
7. **Reports** — week/month pickers, monthly edit window + book photos, rich My Submissions
8. **Resources** — office CMS tables (mobile still hardcoded)
9. **Teams** — full CRUD vs read-only directory
10. **Submissions** — filters, full review dialog, comment thread, verify rules
11. **Admin** — Offices, Office Admin, Applications, Admin Monthly Goals, Trainer Group Weekly, income overview
12. **Sponsor / notifications** — drill-down + review; tap-through links
13. **Edge functions** — `prepare-signup`, `notify-user`, `notify-admin-signup`, `notify-admin-approved`, `delete-user`

**Match web (do not “fix” only on mobile):** realtime off, no section-level verify UI, profile notification toggles cosmetic.

---

## Phase checklists

### Phase 0 — Plan + env

- [x] Replace this file with the parity plan
- [ ] Confirm `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` match website
- [x] Document `EXPO_PUBLIC_SITE_URL=https://prudence-path.online`
- [x] Document `EXPO_PUBLIC_PERCEPTUAL_DEDUP=true`

### Phase 1 — Foundation

- [x] Port AuthContext: office, `office_admin`, email confirm, `prepare-signup` metadata
- [x] Copy website `src/lib/*` business rules (imports adjusted)
- [x] Default theme = website brand; keep neo/crimson as optional extras
- [x] Load Lato (with system-font fallback)
- [x] `AccountRejectedScreen` + `ResetPasswordScreen`
- [x] Deep link scheme `prudence` for confirm + password recovery
- [x] Signup requires office slug (deep link or typed) + username/sponsor RPCs

### Phase 2 — Member core

- [x] Daily Todo: `todoRules` + history + policy
- [x] Daily Activity: today-only lock, tags, SHA exact dedup, Fiverr 20% UI, trainer fields, weekly target 7 (full section/proof parity still to deepen)
- [x] Dashboard: Sunday week, `WEEKLY_PAGES_TARGET = 7`, office name

### Phase 3 — Reports + account

- [ ] Weekly week picker + `get_or_generate_weekly_report_for_week` + `notify-user`
- [ ] Monthly month picker + window + book photos
- [ ] My Submissions full sections/proofs
- [ ] Notifications filters, mark-all, navigate `link`

### Phase 4 — Resources

- [ ] Office Rules / Timetable / Pro Requirements from `officeContent.ts`
- [ ] Skills Hub office-scoped

### Phase 5 — Trainer

- [ ] Teams full CRUD + invite link + `delete-user`
- [ ] Submissions review dialog + `submissionRules`
- [ ] Group Todos + Trainer Group Weekly
- [ ] Sponsor dashboard drill-down (visible to all approved users)

### Phase 6 — Admin

- [ ] Admin Dashboard + income overview
- [ ] Admin Offices, Office Admin, Applications, Admin Monthly Goals
- [ ] Full Admin Skills editor
- [ ] Drawer/settings browser links to marketing pages

### Phase 7 — QA

- [ ] Role × office matrix on iOS + Android
- [ ] Crash reporting, privacy URL, EAS production secrets

---

## Screen map

| Web path | Mobile |
|----------|--------|
| `/auth` | `AuthScreen` |
| `/auth/reset-password` | `ResetPasswordScreen` |
| `/waiting-approval` | `WaitingApprovalScreen` |
| `/account-rejected` | `AccountRejectedScreen` |
| `/dashboard` | `DashboardScreen` |
| `/daily-todo` | `DailyTodoScreen` |
| `/daily-activity` | `DailyActivityScreen` |
| `/weekly-reports` | `WeeklyReportScreen` |
| `/monthly-goals` | `MonthlyGoalsScreen` |
| `/my-submissions` | `MySubmissionsScreen` |
| `/skills-hub` `/office-rules` `/timetable` `/pro-requirements` | Resource screens (DB-backed) |
| `/notifications` `/profile` `/suggestions` | Existing, upgraded |
| `/sponsor-dashboard` | `SponsorDashboardScreen` |
| `/teams` `/submissions` `/group-todos-reports` | Existing, rewritten |
| `/trainer-group-weekly` | `TrainerGroupWeeklyScreen` (new) |
| `/admin-dashboard` `/admin-offices` `/office-admin` `/admin-office-applications` `/admin-monthly-goals` | New native screens |
| `/admin-skills` | `AdminSkillsScreen` upgraded |

---

## Testing matrix (Phase 7)

- Signup with office slug + sponsor; email confirm deep link
- Pending → approved → dashboard; rejected screen
- Todo: edit today only; history after edits
- Activity: lock 11:59 PM WAT; tags lifetime unique; proof SHA + perceptual block
- Trainer approve/reject + email; no stale todo history when switching members
- Roles: member cannot open Teams; pro comments only; office_admin CMS; super_admin provision
- About / FAQ / Apply open prudence-path.online in the browser
