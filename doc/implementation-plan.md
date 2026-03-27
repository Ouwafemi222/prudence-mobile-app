# Prudence Path Mobile App Implementation Plan (iOS + Android)

## Implementation Status Tracker

- **Overall Progress:** 54%
- **Current Active Phase:** Phase 1 (Core MVP)

### Phase Progress
- **Phase 0 - Discovery and setup:** 95% complete
  - Done:
    - Mobile project folder created at `prudence-path-mobile-app`
    - Expo TypeScript app initialized in target folder
    - Core dependencies installed (Supabase, React Query, Navigation, forms/validation)
    - Initial app providers and theme tokens created
    - Supabase mobile client bootstrap created
    - Auth/session context implemented for mobile
    - Route guard navigation flow added (`Welcome` -> `Auth` -> `WaitingApproval` / `Dashboard`)
    - Basic Phase 0 starter screens created for auth and protected shell
    - shadcn-inspired mobile UI primitives created (`Button`, `Input`, `Card`, `Badge`, `Avatar`)
    - Phase 0 screens updated to use the new primitives
    - Fixed Expo AsyncStorage compatibility issue (removed the crash + “auto refresh tick failed” caused by AsyncStorage native module)
    - Post-login navigation shell added (Bottom Tabs: Home/Work/Reports/Resources/Profile)
    - Splash/boot failsafes added (Error Boundary + Supabase getSession timeout)
  - Next:
    - Continue MVP by replacing placeholders with real screens (Auth flows -> Dashboard -> Daily Todo/Daily Activity)

- **Phase 1 - Core MVP:** 38% complete
  - Next:
    - Implement Auth + Waiting Approval (sign-up + reset completed)
    - Implement Dashboard, Daily Todo, Daily Activity
      - Dashboard layout upgraded to premium card-based UI
      - Daily Todo implemented (mobile screen wired to `daily_todos`)
      - Daily Activity MVP implemented (mobile screen wired to `daily_activities`)
      - Work tab upgraded to premium hub layout and now opens real Todo/Activity screens
    - Implement Weekly Reports, Monthly Goals, Profile, Notifications

- **Phase 2 - Role features:** 0% complete
  - Next:
    - Implement Sponsor Dashboard, My Submissions, Teams, Submissions review
    - Implement Group Todos & Reports, Admin Dashboard, Admin Skills

- **Phase 3 - Polish and release hardening:** 0% complete
  - Next:
    - Performance tuning, QA/UAT, push notifications, release pipeline

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

1. Initialize Expo TypeScript project in `prudence-path-mobile-app`
2. Add core dependencies (navigation, react-query, supabase, nativewind, zod, forms)
3. Create `src/theme/tokens.ts` from existing web color system
4. Build base UI primitives (`Button`, `Input`, `Card`, `Text`, `Avatar`, `Badge`)
5. Implement auth/session provider + route guards
6. Implement MVP screens in this order:
   - Sign In/Sign Up/Waiting Approval
   - Dashboard
   - Daily Todo
   - Daily Activity
   - Weekly Reports
   - Profile + Notifications
7. Start role-based modules (Teams/Submissions/Admin) after MVP sign-off

---

This plan is designed to keep full feature parity with the existing website while reusing the current backend and preserving the current visual identity in a mobile-native way.
