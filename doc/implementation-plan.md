# Prudence Path Mobile App Implementation Plan (iOS + Android)

## Implementation Status Tracker

- **Overall Progress:** ~97% (feature build-out against this plan; see **Remaining before store** below)
- **Current Active Phase:** Phase 3 (polish, ops, and production hardening)

### Phase Progress
- **Phase 0 - Discovery and setup:** 100% complete
  - Done:
    - Mobile project folder created at `prudence-path-mobile-app`
    - Expo TypeScript app initialized in target folder
    - Core dependencies installed (Supabase, React Query, Navigation, forms/validation)
    - Initial app providers and theme tokens created
    - Supabase mobile client bootstrap created
    - Auth/session context implemented for mobile (incl. role helpers: `isPro`, `isSponsor`, `isSuperAdmin`, etc.)
    - Route guard navigation flow added (`Welcome` -> `Auth` -> `WaitingApproval` / main app)
    - shadcn-inspired mobile UI primitives created (`Button`, `Input`, `Card`, `Badge`, `Avatar`, …)
    - Post-login navigation: **root native stack** wraps **bottom tabs** so deep screens are not forced into tabs (`MainAppNavigator` + `useMainAppNavigation`)
    - Splash/boot failsafes (Error Boundary + Supabase getSession timeout)
    - `npm run typecheck` (`tsc --noEmit`) for CI/local verification

- **Phase 1 - Core MVP:** ~95% complete
  - Done:
    - Auth + waiting approval; Dashboard, Daily Todo, Daily Activity (incl. uploads); Weekly Reports; Monthly Goals
    - Resources: Skills hub, Timetable, Office Rules, Pro Requirements
    - Profile + avatar path; **Notifications inbox** (`NotificationsInboxScreen`) wired to `notifications` (mark read)
  - Gaps / parity notes:
    - ~~Suggestions attachments~~ — **done** (multi-image upload to `suggestion_attachments`, list shows thumbnails for super admins)
    - Extra animation / skeleton polish where desired

- **Phase 2 - Role features:** ~90% complete
  - Done:
    - **Sponsor Dashboard** (`get_sponsor_downlines` + weekly rollups)
    - **My Submissions** (recent `daily_activities` + morning plan from `daily_todos`)
    - **Submissions review** (queue, comments via `activity_comments`, approve/reject for trainer/super_admin — simplified vs web UI)
    - **Group Todos & Reports** (group + date, per-member flags; pro/trainer/admin)
    - **Teams** (read-only directory for `isAdmin`; full CRUD remains web-first)
    - **Admin hub** + **Admin Skills** (skills list; **overview** edit in modal)
    - **Suggestions** screen (insert + super-admin list)
    - Entry points from **Profile** and **Dashboard** quick actions
  - Gaps / parity notes:
    - Teams / submissions flows are **lighter** than web (no full group assign / rich activity editor in-app)
    - Server-side RLS remains source of truth; confirm policies for `suggestions`, `activity_comments`, and verification columns match assumptions in screens

- **Phase 3 - Polish and release hardening:** ~70% complete
  - Done:
    - **Expo push groundwork:** `expo-notifications` + `expo-device`, config plugin in `app.json`, handler + permission flow, token retrieval when possible (`PushNotificationBootstrap` after approval)
    - **Persist push tokens:** Supabase table `expo_push_tokens` (migration `20260402120000_expo_push_tokens.sql`) + mobile upsert after token registration
    - **EAS profiles:** `eas.json` with `preview` (APK) and `production` (AAB); Android `package` + iOS `bundleIdentifier` in `app.json`
    - TypeScript gate via `typecheck` script
  - Next (production):
    - **Server-side sends:** Edge Function or backend job that reads `expo_push_tokens` and calls Expo Push API (needs secrets + `EXPO_ACCESS_TOKEN` or similar)
    - **Crash reporting / analytics** (e.g. Sentry, Expo insights) — needs project keys and privacy review
    - EAS **projectId** in `app.extra.eas` (run `eas init` / link project) for reliable `getExpoPushTokenAsync` in release builds
    - Store listings, UAT matrix, performance spot-checks on low-end Android

### Remaining before store (ops checklist)
- [ ] Run `eas init` / link Expo account so `projectId` is set (required for production push token API on standalone builds)
- [ ] Implement notification delivery (cron/Edge) using stored Expo tokens + Expo Push API
- [ ] Crash + analytics tooling and QA sign-off
- [ ] Store compliance (privacy policy URL, permissions copy, screenshots)

### Building an Android APK (EAS)

Prerequisites: [Expo account](https://expo.dev), [EAS CLI](https://docs.expo.dev/build/setup/) (`npm i -g eas-cli`), and env vars for Supabase set in EAS secrets or `eas.json` env if needed.

1. **Apply the Supabase migration** for `expo_push_tokens` on your hosted project (`supabase db push` or run SQL from `supabase/migrations/20260402120000_expo_push_tokens.sql` in the SQL editor).

2. From `prudence-path-mobile-app`, log in and configure the project:
   - `eas login`
   - `eas build:configure` (if prompted) or `eas init` to create/link the Expo project and write `extra.eas.projectId` into `app.json`.

3. **Preview APK (internal testing):**  
   `npm run build:android:apk`  
   (same as `eas build --platform android --profile preview` — produces an **APK** via `eas.json` → `preview.android.buildType` = `apk`.)

4. **Play Store release:** use `npm run build:android:bundle` (AAB) and upload to Play Console.

5. **Local .env:** ensure production builds receive `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (EAS: **Project → Secrets** or `eas secret:create`).

See also: [EAS Build — Android](https://docs.expo.dev/build-reference/android-builds/).

## 1) Project Analysis: What exists today

The current project is a web app built with:
- React + TypeScript + Vite
- Tailwind CSS + shadcn UI components
- Supabase (Auth, Postgres, Storage, RPC)
- React Router + role-based route protection

Core purpose:
- A role-based accountability and training system for teams (members, sponsors, pros, trainers, super admins)
- Daily/weekly/monthly productivity reporting, verification, team management, skills tracking, and training resources

## 2) Existing Website Features (to replicate in mobile)

### Authentication and access control
- Sign in / sign up
- Forgot/reset password
- Approval workflow (`pending`, `approved`, `rejected`)
- Protected routes and role-based access by `user_roles`

### Main user features
- Dashboard with:
  - Weekly stats from `daily_activities`
  - Recent activities
  - Consistency score
- Daily Todo (`daily_todos`)
- Daily Activity submission (`daily_activities`)
- Weekly Reports (`weekly_reports`)
- Monthly Goals (`monthly_goals`)
- Skills Hub (`skills`, training plan PDFs from storage bucket)
- Notifications (`notifications`)
- Profile management (`profiles`, avatar upload to `avatars`)
- Office Rules page
- Pro Requirements page
- Timetable page

### Team/advanced features
- Sponsor Dashboard with downline analytics and RPC usage
- My Submissions view (daily activities/todos history)
- Submissions review + comments (`activity_comments`)
- Group Todos & Reports
- Teams management:
  - Group assignment (`groups`)
  - Role assignment (`user_roles`)
  - Member approvals and trainer operations
  - Skill assignment (`user_skills`)
- Suggestions with file/image attachments (`suggestions`, `suggestion_attachments` storage)

### Admin features
- Admin Dashboard
- Admin Skills management (`skills`)
- Team management tools in `Teams`

## 3) Existing Backend/Infra Reuse Strategy

The mobile app will reuse the current backend directly:
- Same Supabase project URL and publishable key (mobile env vars)
- Same tables, policies (RLS), buckets, and RPC functions
- Same roles/approval logic from `profiles` + `user_roles`

No backend rewrite required initially.  
Only add backend changes if mobile-specific needs appear (for example push notification tokens or performance-optimized RPC endpoints).

## 4) Mobile Tech Stack Recommendation

Use **React Native with Expo (TypeScript)** for fastest delivery and shared team skillset with current React code.

Recommended libraries:
- Navigation: `@react-navigation/native`, native stack, bottom tabs
- Server state: `@tanstack/react-query`
- Supabase: `@supabase/supabase-js`
- Forms/validation: `react-hook-form`, `zod`
- UI system: **NativeWind (Tailwind for RN)** + custom reusable design primitives inspired by shadcn
- Icons: `lucide-react-native`
- Storage/session: `@react-native-async-storage/async-storage` (for Supabase auth persistence)
- Image/file upload: `expo-image-picker`, `expo-document-picker`, `expo-file-system`
- Notifications: `expo-notifications`
- Charts: `react-native-chart-kit` or `victory-native`

## 5) shadcn-style Component Strategy for Mobile

Shadcn is web-first, so for mobile we should create a **shadcn-inspired component layer**:
- `Button`, `Input`, `Card`, `Badge`, `Avatar`, `Tabs`, `Toast`, `Dialog/BottomSheet`, `Select`, `Skeleton`
- Keep same naming and variant patterns (`default`, `outline`, `destructive`, sizes, etc.)
- Use design tokens mapped from current web CSS variables (`primary`, `accent`, `muted`, `destructive`, radius, spacing)

This gives consistent brand/design while still being native-mobile friendly.

## 6) Information Architecture (Mobile)

### Public/Auth flow
- Splash
- Welcome
- Sign In
- Sign Up
- Forgot Password
- Waiting Approval

### App tabs (base)
- Home (Dashboard)
- Work (Daily Todo, Daily Activity)
- Reports (Weekly Reports, Monthly Goals)
- Resources (Skills Hub, Timetable, Office Rules, Pro Requirements)
- Profile (Profile, notifications shortcut, settings)

### Role-based extra screens
- Sponsor Dashboard
- My Submissions
- Submissions Review
- Group Todos & Reports
- Teams
- Admin Dashboard
- Admin Skills
- Suggestions Admin view (super admin)

## 7) Feature Parity Mapping (Web -> Mobile)

- `Auth` -> Native auth stack with same Supabase auth calls
- `Dashboard` -> Home tab dashboard widgets/cards/charts
- `DailyTodo` -> Daily todo create/update screen
- `DailyActivity` -> Activity form with image proof upload
- `WeeklyReports` -> Weekly report list/create/update
- `MonthlyGoals` -> Monthly goal planning and progress
- `SkillsHub` -> Skills listing + training plan PDF links
- `Profile` -> Profile edit + avatar upload + user skills summary
- `Notifications` -> In-app notifications list/mark read/delete
- `SponsorDashboard` -> Downline stats and drilldowns
- `Teams` -> Group/member/role management screens
- `Submissions` -> Review queue + comments + verification actions
- `MySubmissions` -> Personal submission history
- `GroupTodosReports` -> Group-level todos/reports insight
- `Suggestions` -> Submit/attach and admin moderation flow

## 8) Delivery Plan (Phased)

## Phase 0 - Discovery and setup (2-4 days)
- Confirm final screen list per role with client
- Create Expo app scaffold inside `prudence-path-mobile-app`
- Configure env and Supabase client
- Build token/theme system from web colors
- Set up navigation skeleton and auth guards

## Phase 1 - Core MVP (2-3 weeks)
- Auth + approval flow
- Dashboard
- Daily Todo
- Daily Activity (+ proof upload)
- Weekly Reports
- Monthly Goals
- Profile + avatar
- Notifications

Exit criteria:
- Member can complete full daily workflow in mobile

## Phase 2 - Role features (2-3 weeks)
- Sponsor Dashboard
- My Submissions
- Submissions review/comments
- Group Todos & Reports
- Teams management
- Admin Dashboard/Admin Skills

Exit criteria:
- Trainer/admin can run core operations from mobile

## Phase 3 - Polish and release hardening (1-2 weeks)
- Performance tuning and query optimization
- Offline-safe UX states (retry, cache hydration, optimistic updates where safe)
- Push notifications
- Analytics, crash reporting
- QA, UAT, app store compliance

Exit criteria:
- Production-ready Android/iOS builds

## 9) Data and Security Requirements

- Keep all role checks server-side via Supabase RLS and policies
- Mobile must never bypass approval status checks
- Use secure token/session persistence
- Validate uploads (size/type), especially suggestions and avatars
- Keep API keys in env files and CI secrets (never hardcode)

## 10) Testing Plan

- Unit tests for business logic utilities and validators
- Integration tests for auth/session and critical CRUD flows
- Device testing on low-end Android + iPhone
- Role matrix QA:
  - member
  - sponsor
  - pro
  - trainer
  - super_admin

Critical test scenarios:
- Signup -> pending approval -> approved access
- Daily activity lock behavior and submission rules
- File upload and display
- Submissions verification/comment roundtrip
- Notifications read/update flow

## 11) Risks and Mitigations

- Risk: Web shadcn components cannot be reused directly in RN  
  Mitigation: Build shadcn-inspired mobile UI kit with shared token values

- Risk: Some web layouts are too dense for phones  
  Mitigation: Redesign information hierarchy for mobile-first cards/lists

- Risk: Supabase query performance on mobile networks  
  Mitigation: Add pagination, selective fields, and RPCs for heavy aggregates

- Risk: Platform-specific upload/permissions behavior  
  Mitigation: Test camera/gallery/files early in Phase 1

## 12) Immediate Next Actions (Execution Checklist)

1. ~~Initialize Expo + core stack~~
2. ~~Auth, tabs, MVP workflows (Work / Reports / Resources / Profile)~~
3. ~~Role stack screens + Profile/Dashboard entry points~~
4. ~~Push notification client bootstrap~~
5. **Run:** `npm run typecheck` before releases; smoke-test navigation per role (member, sponsor, trainer, admin).
6. **Production:** complete *Remaining before store* (EAS `projectId`, server push delivery, crash reporting, UAT). APK steps: **Building an Android APK (EAS)** above.

---

This plan is designed to keep full feature parity with the existing website while reusing the current backend and preserving the current visual identity in a mobile-native way.
