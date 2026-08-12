# Mobile Parity Implementation Plan

**Source of truth (web):** `prudence-path` — https://github.com/smartdane/prudence-path  
**Production web:** https://prudence-path.online  
**Backend:** Single Supabase project (PostgreSQL RLS, Storage, Edge Functions, Auth) — **no duplicate backend**

**Goal:** Update the existing mobile repo so it matches the current web app in theme, roles, business rules, and functionality. One Supabase backend serves both clients.

**How to use this doc:** Give an agent (or developer) the [Agent Execution Prompt](#agent-execution-prompt) at the bottom. Work phase-by-phase; check off each item. Do not skip verification gates.

---

## Table of contents

1. [Architecture decisions](#1-architecture-decisions)
2. [Web vs native vs open-in-browser](#2-web-vs-native-vs-open-in-browser)
3. [Environment & Supabase setup](#3-environment--supabase-setup)
4. [Theme & design parity](#4-theme--design-parity)
5. [Shared business logic (port verbatim)](#5-shared-business-logic-port-verbatim)
6. [Auth & onboarding flow](#6-auth--onboarding-flow)
7. [Navigation & role gating](#7-navigation--role-gating)
8. [Screen-by-screen parity checklist](#8-screen-by-screen-parity-checklist)
9. [Business rules (must match web exactly)](#9-business-rules-must-match-web-exactly)
10. [Storage & uploads (mobile-specific)](#10-storage--uploads-mobile-specific)
11. [Notifications & deep links](#11-notifications--deep-links)
12. [Realtime strategy](#12-realtime-strategy)
13. [Implementation phases](#13-implementation-phases)
14. [Testing matrix](#14-testing-matrix)
15. [Known web gaps (implement same on both)](#15-known-web-gaps-implement-same-on-both)
16. [Agent execution prompt](#agent-execution-prompt)

---

## 1. Architecture decisions

### Single source of truth

| Layer | Source of truth | Mobile action |
|-------|-----------------|----------------|
| Database schema & RLS | Supabase migrations in `supabase/migrations/` | **Do not** create mobile-only tables. Run same migrations. |
| Auth users & sessions | Supabase Auth | Same `VITE_SUPABASE_URL` / anon key (mobile env names differ). |
| Business rules (locks, tags, dedup) | DB triggers + RPCs | Call same RPCs; mirror client checks from web `src/lib/`. |
| Edge functions | `supabase/functions/` | Invoke same functions from mobile. |
| Types | `src/integrations/supabase/types.ts` | Copy/regenerate after migrations. |

### Recommended mobile stack (if not already chosen)

- **Expo + React Native + TypeScript** (best Supabase ecosystem fit)
- **@supabase/supabase-js** — same client as web
- **React Navigation** — stack + tabs mirroring web nav groups
- **AsyncStorage** (or SecureStore for tokens) — session persistence
- **expo-image-picker** — proof photos
- **expo-linking** + **expo-web-browser** — open website pages & external URLs

### Code sharing strategy (pick one)

**Option A — Recommended for speed:** Copy `src/lib/` files into mobile repo `lib/` and keep in sync manually until stable.  
**Option B — Long term:** Monorepo with `packages/shared` containing `lib/`, `types/`, and business hooks.  
**Option C — Minimal:** Duplicate logic in mobile but **must** pass the [Testing matrix](#14-testing-matrix).

For the first parity pass, use **Option A**: port these files **verbatim** (adjust imports only):

```
src/lib/nigeriaTime.ts
src/lib/todoRules.ts
src/lib/submissionRules.ts
src/lib/activityTypes.ts
src/lib/proofImageHash.ts
src/lib/proofImagePerceptualHash.ts  (adapt Canvas → expo-image-manipulator or RN image lib)
src/lib/fetchTodoSubmissionData.ts
src/lib/tenantScope.ts
src/lib/notifyUser.ts
src/lib/invokeEdgeFunction.ts
src/lib/teamNotifications.ts
src/lib/reportTargets.ts
src/lib/monthlyGoalWindow.ts
src/lib/officeContent.ts
src/lib/officeContentAdmin.ts
src/lib/siteConfig.ts
src/integrations/supabase/types.ts
```

---

## 2. Web vs native vs open-in-browser

Not every web route becomes a native screen. Marketing and some admin flows are better on the website.

### Open in browser (Linking / WebBrowser)

Use `https://prudence-path.online{path}` (or `SITE_URL` from env). Preserve auth cookies **only** if using in-app browser with shared session — otherwise user logs in on web separately.

| Web path | Mobile behavior | Reason |
|----------|-----------------|--------|
| `/` | **Browser** → home/marketing | SEO landing; not needed in app |
| `/features` | **Browser** | Marketing |
| `/about` | **Browser** | Marketing |
| `/how-it-works` | **Browser** | Marketing |
| `/faq` | **Browser** | Marketing |
| `/apply` | **Browser** | Org application (super_admin provisioning) |
| `/pricing` | **Browser** | Marketing |
| `/demo` | **Browser** | Marketing |
| `/sitemap.xml` | **Browser** | SEO only |

**Settings / About links in mobile:** Add menu items like “Learn about THE PRUDENCE” → open browser to `/features`, “Apply for your organization” → `/apply`.

### Native screens (full parity required)

All authenticated app routes below must be **native screens** with same behavior as web.

| Web path | Mobile screen | Roles |
|----------|---------------|-------|
| `/auth` | Auth (login + signup tabs) | Public |
| `/auth/reset-password` | Reset password **or** deep link handler | Public |
| `/waiting-approval` | Waiting approval | Pending users |
| `/account-rejected` | Account rejected | Rejected users |
| `/dashboard` | Dashboard | All approved |
| `/daily-todo` | Daily todo | All approved |
| `/daily-activity` | Daily activity | All approved |
| `/my-submissions` | My submissions | All approved |
| `/weekly-reports` | Weekly reports | All approved |
| `/monthly-goals` | Monthly goals | All approved |
| `/skills-hub` | Skills hub | All approved |
| `/office-rules` | Office rules | All approved |
| `/pro-requirements` | Pro requirements | All approved |
| `/timetable` | Timetable | All approved |
| `/notifications` | Notifications | All approved |
| `/profile` | Profile | All approved |
| `/settings` | Profile (alias) | All approved |
| `/sponsor-dashboard` | Sponsor dashboard | All approved (empty if no downlines) |
| `/suggestions` | Suggestions | Public submit + super_admin list |
| `/admin-dashboard` | Admin dashboard | super_admin, trainer |
| `/admin-offices` | Admin offices | super_admin |
| `/office-admin` | Office admin | office_admin, super_admin |
| `/admin-office-applications` | Office applications | super_admin |
| `/admin-monthly-goals` | Admin monthly goals | super_admin, trainer |
| `/admin-skills` | Admin skills | super_admin, trainer |
| `/teams` | Teams | super_admin, trainer |
| `/submissions` | Submissions review | super_admin, trainer, pro, sponsor |
| `/group-todos-reports` | Group todos & reports | super_admin, trainer, pro |
| `/trainer-group-weekly` | Trainer group weekly | super_admin, trainer |

### Hybrid: native UI + open external URL

These stay **native** but open browser for linked content:

| Feature | Native UI | Opens browser for |
|---------|-----------|-------------------|
| Daily activity / submissions | Proof images, form | User-entered **gig links**, **account links** (`https://...`) |
| Skills hub | Skill list, detail | **Training plan PDF** (`training-plans` bucket public URL) |
| Teams | Invite management | **Invite link** preview (optional browser test) |
| Submissions review | Full review dialog | External proof URLs if any |
| Suggestions | Form + images | Attached image URLs (storage public URLs) |
| Marketing footer equivalent | N/A in app | `mailto:agboola378@gmail.com` |

---

## 3. Environment & Supabase setup

### Mobile env vars (mirror web)

```env
EXPO_PUBLIC_SUPABASE_URL=<same as VITE_SUPABASE_URL>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<same as VITE_SUPABASE_PUBLISHABLE_KEY>
EXPO_PUBLIC_SITE_URL=https://prudence-path.online
EXPO_PUBLIC_PERCEPTUAL_DEDUP=true
```

### Supabase client (match web behavior)

Reference: `src/integrations/supabase/client.ts`

- Persist session in AsyncStorage
- `detectSessionInUrl: false` on mobile (use deep links instead)
- Same auth flow: email confirmation required before profile load

### Regenerate types after any migration

```bash
# From web repo or Supabase CLI
supabase gen types typescript --project-id <ref> > types/database.ts
```

Ensure types include: `proof_image_hashes`, `user_submission_tags`, `daily_todo_logs`, all office content tables.

### Edge functions to wire (same as web)

| Function | When |
|----------|------|
| `prepare-signup` | Before signup |
| `notify-user` | Approve/reject submission, member approval, etc. |
| `notify-admin-signup` | Waiting approval page (once) |
| `notify-admin-approved` | Teams approve |
| `delete-user` | Teams delete (super_admin) |

Cron functions (`daily-reminder-notifications`, etc.) run server-side — no mobile code needed.

---

## 4. Theme & design parity

Web is **light mode only**. Match these exactly.

### Colors

| Token | HSL | Hex |
|-------|-----|-----|
| Background | `0 0% 96%` | `#F5F5F5` |
| Foreground | `0 0% 9%` | `#171717` |
| Primary | `243 75% 58%` | `#5B52EB` |
| Primary foreground | `225 100% 96%` | `#EEF2FF` |
| Accent | `250 100% 97%` | `#F5F3FF` |
| Accent foreground | `258 89% 66%` | `#A855F7` |
| Muted foreground | `0 0% 9%` | `#171717` |
| Border | `0 0% 83%` | `#D4D4D4` |
| Destructive | `0 72% 50%` | `#DC2626` |
| Success | `142 76% 36%` | `#16A34A` |
| Warning | `38 92% 50%` | `#F59E0B` |

### Chart / stat icon colors

| Chart | Hex |
|-------|-----|
| chart-1 | `#93A4FB` |
| chart-2 | `#C4B5FD` |
| chart-3 | `#D8B4FE` |
| chart-4 | `#6366F1` |
| chart-5 | `#737373` |

### Typography

- **UI font:** Lato 400, 700 (load via expo-google-fonts)
- **Logo wordmark:** “THE PRUDENCE” (hardcoded; not per-office)
- **Office name:** Shown as suffix “· {office.name}” from auth context

### Layout patterns

- **Screen background:** gradient `#F5F5F5` → subtle `#F5F3FF` tint (bottom-right)
- **Cards:** white ~70% opacity, 20px blur (use `BlurView` on iOS), 20px radius, soft shadow
- **Nav height:** 64px + safe area
- **Active nav item:** solid `#5B52EB` background, `#EEF2FF` text
- **Avatar fallback:** gradient `#5B52EB` → `#A855F7`

### Branding hook (port logic)

From `useAppBranding.ts`:

```ts
appName = officeName ?? "THE PRUDENCE"
titleSuffix = appName  // "Daily Activity | {officeName}"
```

No per-office colors or custom logos in codebase today.

---

## 5. Shared business logic (port verbatim)

These files encode rules that **must not drift** between web and mobile:

| File | Purpose |
|------|---------|
| `nigeriaTime.ts` | WAT timezone, week start Sunday, lock countdown |
| `todoRules.ts` | Same-day todo edit window |
| `submissionRules.ts` | Who can verify whom; resubmit verification reset |
| `activityTypes.ts` | Tag normalization, proof path helpers, tag boxes |
| `proofImageHash.ts` | SHA-256 + registry fetch/record |
| `proofImagePerceptualHash.ts` | dHash (adapt image pipeline for RN) |
| `fetchTodoSubmissionData.ts` | Todo plan + logs for submission review |
| `tenantScope.ts` | `scopeToUserOffice()` on queries |
| `reportTargets.ts` | Weekly pages target (etc.) |
| `monthlyGoalWindow.ts` | Monthly goal edit windows |

---

## 6. Auth & onboarding flow

Port from `AuthContext.tsx` + `Auth.tsx` + `ProtectedRoute.tsx`.

### Signup URL params (deep links)

Mobile must handle:

```
/auth?tab=signup
/auth?tab=signup&office={slug}           # required for new members
/auth?tab=signup&office={slug}&sponsor={username}
/auth?confirmed=1                        # post-email-confirmation
```

Flow:

1. Call edge function `prepare-signup` before signup
2. Sign up with metadata: `full_name`, `username`, `sponsor_username`, `office_slug`
3. Resolve office via RPC `get_office_id_by_slug`
4. Validate username via `is_username_available` (office-scoped)
5. Validate sponsor via `is_sponsor_in_office`
6. Email confirmation → deep link back to app
7. Pending approval → `/waiting-approval` screen
8. Rejected → `/account-rejected`

### Guard matrix (React Navigation equivalents)

| Guard | Condition | Redirect |
|-------|-----------|----------|
| Public only | Authed + approved | Dashboard |
| Protected | Not authed | Auth |
| Protected | Unconfirmed email | Auth |
| Protected | Pending approval | Waiting approval |
| Protected | Rejected | Account rejected |
| Role gate | Wrong role | Dashboard |

### Roles (exact strings)

`super_admin` | `office_admin` | `trainer` | `pro` | `sponsor` | `member`

Load from `user_roles` table scoped by `office_id` (see `AuthContext`).

---

## 7. Navigation & role gating

Mirror web `Navbar.tsx` link visibility.

### Tab bar (suggested — all roles)

| Tab | Route | Icon |
|-----|-------|------|
| Home | Dashboard | Home |
| Todo | Daily todo | CheckSquare |
| Activity | Daily activity | Clipboard |
| More | Menu drawer | Menu |

### Drawer / “More” menu (role-filtered)

**All approved roles:**
- Weekly reports, Monthly goals, My submissions, Skills hub, Office rules, Timetable, Pro requirements, Notifications, Profile, Sponsor dashboard

**trainer + super_admin:**
- Admin dashboard, Teams, Submissions, Group todos & reports, Trainer group weekly, Admin skills, Admin monthly goals

**pro:**
- Submissions (comment only), Group todos & reports

**sponsor:**
- Submissions (read + comment)

**office_admin:**
- Office admin

**super_admin only:**
- Admin offices, Admin office applications, Suggestions admin view

### Link to website (footer of drawer)

- About → `SITE_URL/about`
- Apply for organization → `SITE_URL/apply`
- FAQ → `SITE_URL/faq`

---

## 8. Screen-by-screen parity checklist

Use this as the master checklist. Each item must match web behavior.

### Core member workflow

#### Dashboard (`Dashboard.tsx`)
- [ ] Weekly stats: pages, gigs, income, contacts, consistency
- [ ] Submission streak / lock status for today
- [ ] Quick links to daily todo & daily activity
- [ ] Office name in header via branding hook

#### Daily todo (`DailyTodo.tsx`)
- [ ] Policy notice `todo_same_day_v1` (AsyncStorage dismiss)
- [ ] Plan editable **today only** before 11:59 PM WAT
- [ ] Past/future dates read-only
- [ ] `TodoUpdateHistory` component — version list from `daily_todo_logs`
- [ ] Upsert to `daily_todos`; trigger logs changes

#### Daily activity (`DailyActivity.tsx`) — **largest screen**
- [ ] Collapsible sections: reading, gigs, accounts, income, prospecting, skills, tags, other
- [ ] Trainer-only section: training given
- [ ] Weekly reading progress bar (target from `reportTargets.ts`)
- [ ] Morning todo display (read today’s plan)
- [ ] Policy notice `tags_lifetime_v2`
- [ ] **Tags:** one tag per input box, up to 10, lifetime unique per office, case-insensitive
- [ ] **Proof uploads:** all sections (reading, skill, other, gig, account, prospecting)
- [ ] SHA-256 exact duplicate block (`check_proof_image_hash` RPC)
- [ ] Perceptual dHash duplicate block (`VITE_PERCEPTUAL_DEDUP` / env equivalent)
- [ ] Fail-open if perceptual hash fails
- [ ] Submission lock 11:59 PM WAT (`is_today_submission_locked` RPC + client fallback)
- [ ] Fiverr fee auto-calc (20%)
- [ ] Resubmit after rejection clears verification (see `verificationFieldsOnResubmit`)
- [ ] Record hashes in `proof_image_hashes` on submit

#### My submissions (`MySubmissions.tsx`)
- [ ] List past activities with status
- [ ] Show todo plan alongside activity for each date

#### Weekly reports (`WeeklyReports.tsx`)
- [ ] Auto-generate via `get_or_generate_weekly_report_for_week`
- [ ] Member reflection fields + view trainer feedback
- [ ] Trainer can submit feedback → `notify-user`

#### Monthly goals (`MonthlyGoals.tsx`)
- [ ] `get_or_generate_monthly_goal` RPC
- [ ] Goal book image upload to `avatars` bucket
- [ ] Consistency score display

### Resources (office-scoped content)

#### Skills hub (`SkillsHub.tsx`)
- [ ] List skills from `skills` table
- [ ] User skill assignments from `user_skills`
- [ ] Open training plan PDF in browser (`training-plans` bucket)

#### Office rules (`OfficeRules.tsx`)
- [ ] `office_rule_sections` grouped by category

#### Timetable (`Timetable.tsx`)
- [ ] `office_timetable_slots` ordered list

#### Pro requirements (`ProRequirements.tsx`)
- [ ] `office_pro_requirements` with icons

### Trainer / admin screens

#### Teams (`Teams.tsx`)
- [ ] Pending / approved / rejected tabs
- [ ] Approve/reject with notifications
- [ ] Assign group, trainer, sponsor, role, skills
- [ ] **`office_id` on all inserts** (user_roles, user_skills)
- [ ] Invite link: `{SITE_URL}/auth?tab=signup&office={slug}&sponsor={username}`
- [ ] Delete user (super_admin) → `delete-user` edge function
- [ ] Sponsor validation via `is_sponsor_in_office` RPC

#### Submissions (`Submissions.tsx`)
- [ ] Filters: pending/approved/rejected/all, date, group, search, userId deep link
- [ ] Review dialog: todo plan + **TodoUpdateHistory** (no stale data on switch — clear state immediately)
- [ ] Approve/reject with feedback → `notify-user` + email
- [ ] Comments thread (`activity_comments`)
- [ ] pro/sponsor: comment only, no verify
- [ ] Proof image display from `avatars` bucket
- [ ] External gig/account links → open browser

#### Group todos & reports (`GroupTodosReports.tsx`)
- [ ] pro: assigned group only
- [ ] Uses `SubmissionReviewDialog`

#### Trainer group weekly (`TrainerGroupWeekly.tsx`)
- [ ] Group weekly rollup view

#### Admin dashboard, Admin skills, Admin monthly goals, Admin offices, Admin office applications, Office admin
- [ ] Port each page’s CRUD/query patterns from web
- [ ] Office admin: approve members (profile only), edit office content via `officeContentAdmin.ts`
- [ ] Super admin: `provision_office_from_application` RPC

### Sponsor

#### Sponsor dashboard (`SponsorDashboard.tsx`)
- [ ] `get_sponsor_downlines` RPC
- [ ] Per-downline weekly/monthly rollups
- [ ] Submission review dialog for downlines

### Account

#### Profile (`Profile.tsx`)
- [ ] Avatar upload to `avatars`
- [ ] Username, full name (read-only fields as web)
- [ ] Notification toggles (UI only on web — match cosmetic state)

#### Notifications (`Notifications.tsx`)
- [ ] List from `notifications` table, mark read
- [ ] Tap notification → navigate to `link` path if internal

#### Suggestions (`Suggestions.tsx`)
- [ ] Public: submit message + images to `suggestion_attachments`
- [ ] super_admin: list/delete

---

## 9. Business rules (must match web exactly)

### Time & locks (WAT = Africa/Lagos)

| Rule | Implementation |
|------|----------------|
| Submission deadline | 11:59 PM on activity date |
| Todo editing | Same calendar day only until lock |
| Week boundaries | Sunday start (`nigeria_week_start`) |

### Tags (daily activity)

| Rule | Detail |
|------|--------|
| UI | One tag per box, max 10 per report |
| Normalization | `trim().toLowerCase()` |
| Lifetime | Each `(user_id, office_id, tag)` once ever |
| Validation | DB trigger `validate_submission_tags` + client pre-check |
| Registry | `user_submission_tags` + scan past `daily_activities.submission_tags` |
| Same-day edit | Tags on current activity allowed; new tags checked against history |

### Proof images

| Rule | Detail |
|------|--------|
| Exact duplicate | SHA-256 → `check_proof_image_hash` |
| Similar image | dHash, Hamming ≤ 6 (if perceptual dedup enabled) |
| Storage | `avatars` bucket, path `{user_id}/{type}_{timestamp}.{ext}` |
| Registry | `proof_image_hashes` on submit |
| Same-day re-edit | Exclude current `activity_id` from duplicate check |

### Verification

| Rule | Detail |
|------|--------|
| Who can verify | `super_admin`, `trainer` only |
| Cannot verify | Own submission; `super_admin` submissions |
| pro/sponsor | Read + comment only |
| Rejection | Requires feedback text; email sent |

### Multi-tenant

| Rule | Detail |
|------|--------|
| Scope | All queries filter by user's `office_id` |
| Signup | Requires `?office=slug` |
| Usernames | Unique per office |
| super_admin | Can switch office via managed office hook |

---

## 10. Storage & uploads (mobile-specific)

### Image picker flow (replace web File/Canvas)

1. `expo-image-picker` → get image URI
2. Read bytes for SHA-256 (same as `hashFileSha256`)
3. dHash: use `expo-image-manipulator` resize 9×8 + pixel read, or port algorithm
4. Upload via `supabase.storage.from('avatars').upload(path, blob, { contentType })`
5. On failure: fail-open for perceptual, block for exact SHA duplicate

### Buckets

| Bucket | Mobile usage |
|--------|--------------|
| `avatars` | Profile, all proof images, monthly goal books |
| `training-plans` | Read-only URLs (admin uploads from web) |
| `suggestion_attachments` | Suggestion form |

### Permissions

- Camera + photo library permissions (iOS/Android)
- Handle HEIC (iOS) — perceptual hash fail-open if decode fails

---

## 11. Notifications & deep links

### Deep link scheme (configure in Expo)

```
prudence://auth/confirmed
prudence://auth/reset-password
prudence://notifications
prudence://daily-activity
prudence://submissions?userId=...
```

Match web paths where possible. Supabase Auth redirect URLs must include mobile deep links in Supabase Dashboard.

### Push notifications (optional phase 2)

Cron edge functions already send email. For push:
- Store Expo push token on profile (future migration)
- Or rely on in-app notifications table only for v1

---

## 12. Realtime strategy

Web has `REALTIME_SYNC_ENABLED = false` — realtime infra exists but is off.

**Mobile v1 recommendation:** Same as web — **pull-to-refresh** on:
- Dashboard, Daily activity, Submissions, Teams, Notifications

**Optional v2:** Enable Supabase realtime on `notifications` and `daily_activities` for trainers.

---

## 13. Implementation phases

### Phase 0 — Audit mobile repo (1 day)

- [ ] Record mobile stack, navigation library, existing screens
- [ ] Diff against [Screen checklist](#8-screen-by-screen-parity-checklist)
- [ ] Confirm Supabase project ID matches web production
- [ ] List breaking differences to fix first

### Phase 1 — Foundation (2–3 days)

- [ ] Supabase client + AuthContext port
- [ ] Navigation guards (role gating)
- [ ] Theme tokens + glass card components
- [ ] Copy `src/lib/*` + types
- [ ] Deep links for auth confirmation & password reset

### Phase 2 — Member core (4–5 days)

- [ ] Dashboard, Daily todo, Daily activity (full form + uploads + tags + dedup)
- [ ] My submissions, Weekly reports, Monthly goals
- [ ] Policy notices (AsyncStorage dismiss)

### Phase 3 — Resources & account (2 days)

- [ ] Skills hub, Office rules, Timetable, Pro requirements
- [ ] Profile, Notifications, Suggestions

### Phase 4 — Trainer & review (4–5 days)

- [ ] Teams (full parity including office_id fixes)
- [ ] Submissions + SubmissionReviewDialog (todo history fix)
- [ ] Group todos, Trainer group weekly, Admin skills, Admin monthly goals

### Phase 5 — Admin & sponsor (3 days)

- [ ] Sponsor dashboard, Office admin, Admin offices, Admin applications, Admin dashboard

### Phase 6 — Website links & polish (1–2 days)

- [ ] Drawer links to marketing pages (browser)
- [ ] External URL handling (gig links, PDFs)
- [ ] Safe area, keyboard avoidance, offline error messages

### Phase 7 — QA & release (2–3 days)

- [ ] Full [Testing matrix](#14-testing-matrix) on iOS + Android
- [ ] TestFlight / internal APK
- [ ] App Store / Play Store metadata

**Estimated total:** 3–4 weeks for one experienced RN developer with this plan.

---

## 14. Testing matrix

Run on **iOS and Android** with at least two offices and users in each role.

### Auth & tenant
- [ ] Signup with `office` slug + sponsor
- [ ] Email confirmation deep link
- [ ] Waiting approval → approved → dashboard
- [ ] Rejected account screen
- [ ] Login persists after app restart

### Daily workflow
- [ ] Todo: edit today, blocked yesterday/tomorrow
- [ ] Todo history shows versions after edits
- [ ] Activity: submit before 11:59 PM, locked after
- [ ] Tags: two boxes same day, blocked on second day
- [ ] Tags: `Agno` blocked if `agno` used before
- [ ] Proof: same file blocked next day
- [ ] Proof: re-screenshot blocked (perceptual)
- [ ] Proof: same-day re-edit allowed

### Trainer
- [ ] Approve/reject submission + email
- [ ] Comment on submission
- [ ] Switch between users in submissions — **no stale todo history**
- [ ] Teams: assign role with office_id
- [ ] Invite link opens signup with correct office

### Roles
- [ ] member cannot access `/teams`
- [ ] pro can comment, not verify
- [ ] sponsor sees downlines only
- [ ] office_admin can approve pending members
- [ ] super_admin cross-office admin

### Website links
- [ ] “About” opens prudence-path.online in browser
- [ ] Gig link in submission opens browser
- [ ] Training PDF opens browser

---

## 15. Known web gaps (implement same on both)

Do not “fix” differently on mobile — match web unless product says otherwise:

1. `activity_section_verifications` — DB exists, **no UI yet** on web or mobile
2. Profile notification toggles — **not persisted** (cosmetic)
3. Office admin approve — **no** Teams-style email/role flow
4. Realtime — **disabled** on web; use refresh on mobile
5. `notify-sponsor-signup` edge function — exists but **not wired** on web

---

## Agent execution prompt

Copy everything below into a new agent session pointed at the **mobile repo**. Replace `{MOBILE_REPO_PATH}` and confirm Supabase credentials.

```
You are updating the Prudence mobile app to full parity with the web app.

REFERENCE (read-only source of truth for behavior):
- Web repo: https://github.com/smartdane/prudence-path
- Plan doc: docs/MOBILE_PARITY_IMPLEMENTATION_PLAN.md (in web repo)
- Production web: https://prudence-path.online
- Backend: SAME Supabase project as web (single source of truth — no new tables, no forked schema)

MOBILE REPO: {MOBILE_REPO_PATH}

RULES:
1. Work phase-by-phase (Phase 0 → 7). Complete verification gates before next phase.
2. Port business logic from web src/lib/ verbatim — do not reimplement rules differently.
3. All authenticated app screens must be NATIVE — not WebViews.
4. Marketing pages (/features, /about, /apply, /pricing, /demo, /faq, /how-it-works) open in system browser at https://prudence-path.online{path}.
5. Match theme: primary #5B52EB, accent #A855F7, background #F5F5F5, font Lato, glass cards.
6. Match ALL business rules: WAT locks, same-day todo, lifetime tags (one per box, case-insensitive), proof SHA + perceptual dedup, multi-tenant office_id scoping.
7. Use same RPCs and edge functions as web.
8. Regenerate/copy Supabase types from web after confirming migrations applied.

START:
Phase 0 — Audit the mobile repo against docs/MOBILE_PARITY_IMPLEMENTATION_PLAN.md section 8 checklist. Output a gap table (screen × status: missing/partial/done).

Then Phase 1 — Foundation:
- Supabase client + session persistence
- AuthContext + role loading from user_roles
- Navigation with ProtectedRoute equivalents
- Theme tokens
- Copy lib/ files listed in plan section 5

After each phase, run relevant tests from section 14 and report pass/fail.

When porting Daily Activity and Submissions, reference these web files exactly:
- src/pages/DailyActivity.tsx
- src/pages/Submissions.tsx
- src/components/submissions/SubmissionReviewDialog.tsx
- src/components/todos/TodoUpdateHistory.tsx
- src/lib/proofImageHash.ts, proofImagePerceptualHash.ts, activityTypes.ts

For website links in mobile drawer/settings, use expo-linking or expo-web-browser to open SITE_URL paths — do NOT rebuild marketing pages natively.

Do not commit secrets. Ask before changing Supabase schema.
```

---

## Reference: web file map

| Concern | Primary web files |
|---------|-------------------|
| Routes | `src/App.tsx` |
| Auth | `src/contexts/AuthContext.tsx`, `src/pages/Auth.tsx`, `src/components/ProtectedRoute.tsx` |
| Nav | `src/components/layout/Navbar.tsx` |
| Daily todo | `src/pages/DailyTodo.tsx`, `src/lib/todoRules.ts` |
| Daily activity | `src/pages/DailyActivity.tsx` |
| Submissions | `src/pages/Submissions.tsx`, `src/components/submissions/SubmissionReviewDialog.tsx` |
| Teams | `src/pages/Teams.tsx` |
| Multi-tenant | `docs/MULTI_TENANT_ARCHITECTURE.md`, `src/lib/tenantScope.ts` |
| Migrations | `supabase/migrations/` (latest: `20260811070000_*`) |
| Theme | `src/index.css`, `tailwind.config.ts` |
| Notifications | `docs/EMAIL_AND_NOTIFICATIONS_AUDIT.md`, `src/lib/notifyUser.ts` |

---

*Last synced with web commit: `c87be8f` (main). Update this doc when web ships major features.*
