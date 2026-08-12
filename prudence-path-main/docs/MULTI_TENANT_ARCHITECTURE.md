# Multi-Tenant Architecture — THE PRUDENCE

**Status:** Phase 8 automated checks passed; manual 2-office QA remaining  
**Last updated:** 2026-08-06

---

## Goals

Transform THE PRUDENCE from a single implicit office into a **multi-tenant platform** on one domain (`prudence-path.online`), with strict **row-level isolation** by `office_id`.

---

## Locked decisions

| Topic | Decision |
|-------|----------|
| Platform admin | `super_admin` — global, full access all offices |
| Office owner | `office_admin` — owns office config, not a trainer by default |
| Trainer | Built-in limited role — verify submissions, approve group members |
| Custom roles | **Only `office_admin`** creates roles + permissions from frontend |
| Signup | Invite links `?office=slug&sponsor=username` + email invites |
| Usernames | Unique **per office** (`office_id`, `username`) |
| One user, one office | Second office = new email/account |
| New offices | `/apply` → `super_admin` approves → auto-provision office + clone templates |
| Content | Rules, timetable, pro requirements, skills — **all in DB** per office |
| Member approval | `office_admin` (any member) OR `trainer` (own group only) |
| Submission verify | Trainers / custom roles — not `office_admin` by default |
| Billing | Free |
| Domain | Single domain, RLS by `office_id`, office name in app header |

---

## Tenant model

```
offices (tenant root)
  ├── profiles (office_id, username scoped)
  ├── groups (office_id)
  ├── skills (office_id)
  ├── user_roles (office_id) — built-in + future custom RBAC
  ├── daily_activities, daily_todos, weekly_reports, monthly_goals, …
  └── office_settings / rules / timetable / pro_requirements (Phase 3 — done)
```

**Office #1:** slug `prudence`, name `Prudence` — all existing data backfilled here.

---

## Roles (Phase 1 built-ins)

| Role | Scope | Notes |
|------|-------|-------|
| `super_admin` | Platform | All offices; audit; applications; suspend offices |
| `office_admin` | One office | Owner console — roles, rules, invites, settings |
| `trainer` | One office | Verify submissions; approve group members |
| `pro` | One office | Group-scoped read (unchanged semantics) |
| `sponsor` | One office | Downline read (unchanged, office-scoped tree) |
| `member` | One office | Self-service reporting |

Custom roles (Phase 4): `office_roles`, `office_role_permissions`, `office_member_roles`.

---

## Permission keys (Phase 4 preview)

`approve_members`, `verify_submissions`, `manage_skills`, `manage_rules`, `manage_groups`, `invite_members`, `view_reports`, `manage_timetable`, `manage_pro_requirements`, `manage_office_settings`

`office_admin` bypasses custom RBAC within their office.

---

## RLS strategy

### Helpers (Phase 1)

- `get_user_office_id(user_id)` — from `profiles.office_id`
- `user_is_super_admin(user_id)` — existing
- `user_is_office_admin(user_id, office_id)` — `office_admin` role + same office
- `users_share_office(a, b)` — same `office_id`
- `is_admin(user_id)` — **Phase 1 unchanged** (`super_admin` \| `trainer`); Phase 7 narrows to office-scoped trainer checks

### Policy pattern (Phase 1 RLS rewrite)

Every tenant table policy adds:

```sql
AND (
  public.user_is_super_admin(auth.uid())
  OR office_id = public.get_user_office_id(auth.uid())
)
```

Sponsor/pro downline helpers gain office guard:

```sql
AND profiles.office_id = public.get_user_office_id(auth.uid())
```

---

## Signup flows (Phase 5)

**A — Invite link:** `/auth?tab=signup&office=prudence&sponsor=username`  
**D — Email invite:** office admin sends link with pre-bound office  

Block orphan signups without office context (except `super_admin` bootstrap). Existing Prudence members use `?office=prudence`.

**Daily todos:** Members can plan for **future dates** (editable anytime). Past dates remain read-only; today locks at 11:59 PM WAT like daily reports.

---

## Office provisioning (Phase 2)

1. Public `/apply` → `office_applications` (done)
2. `super_admin` review queue at `/admin-office-applications` (done)
3. RPC `provision_office_from_application(id)` (done):
   - Create `offices` row with auto slug
   - Clone Prudence skills template
   - Store `pending_admin_email` in office settings
   - First signup with matching email → `office_admin`
   - Super admin copies signup link: `/auth?tab=signup&office={slug}`

Email confirmation to applicant: manual for now (Phase 6).

---

## Migration plan — Office #1

1. Create `offices` table + seed `prudence`
2. Add nullable `office_id` to all tenant tables
3. Backfill every row with Prudence `office_id`
4. Set `NOT NULL` + FK constraints
5. Replace `profiles.username` global UNIQUE → `(office_id, username)`
6. Update `is_username_available(p_username, p_office_id)`
7. Phase 1 RLS migration (separate file — policies rewritten in batch)
8. Frontend: load office in AuthContext (Phase 7)

---

## Phases overview

| Phase | Focus |
|-------|--------|
| **0** | This spec |
| **1** | `offices`, `office_id`, backfill, `office_admin` enum, username scope |
| **2** | Applications queue + provision RPC |
| **3** | DB content (rules, timetable, pro reqs) per office |
| **4** | Custom RBAC |
| **5** | Signup / invites |
| **6** | Office admin + platform dashboards |
| **7** | AuthContext, frontend `office_id` audit, marketing |
| **8** | QA cross-office isolation, E2E, deploy |
| **8b** | Responsive QA (320px–1280px+); mobile-first for all new UI |

---

## Responsive (Phase 8b)

All **new** multi-tenant screens (`/apply` queue, office admin console, platform panel) must be **mobile-first**:

- Tailwind: `grid-cols-1` default, `sm:` / `lg:` breakpoints
- Tables → card list or horizontal scroll on `< md`
- Dialogs → full-screen sheet on mobile where appropriate
- Test matrix: 320, 375, 768, 1024, 1280px

Existing app: responsive pass before GA of multi-tenant.

---

## Files touched (Phase 1–3)

- `supabase/migrations/20260806180000_multi_tenant_offices_foundation.sql` — offices, office_id, backfill, helpers
- `supabase/migrations/20260806190000_multi_tenant_rls_office_scope.sql` — RLS rewrite + sponsor/pro office guards
- `supabase/migrations/20260806160000_office_applications.sql` — applications table
- `supabase/migrations/20260806200000_provision_office_from_application.sql` — provision RPC + office_admin on first signup
- `supabase/migrations/20260806210000_office_content_per_tenant.sql` — rules/timetable/pro reqs + clone on provision
- `supabase/migrations/20260806220000_office_scope_admin_rpcs.sql` — office-scoped admin checks in report/goal RPCs
- `supabase/migrations/20260806230000_phase5_signup_future_todos_security.sql` — signup gate, future todos, secure internal RPCs
- `src/pages/AdminOfficeApplications.tsx`, `src/pages/Auth.tsx`, `src/lib/officeContent.ts`
- `supabase/migrations/20260806240000_office_admin_update_office.sql` — office_admin can update office name
- `src/pages/OfficeAdmin.tsx`, `src/lib/officeContentAdmin.ts`
- `src/hooks/useAppBranding.ts`, `src/lib/tenantScope.ts`, `src/components/seo/TenantAppSeo.tsx`
- `src/pages/AdminOffices.tsx` — super_admin platform offices overview
- `supabase/tests/multi_tenant_isolation_verify.sql`
- `supabase/migrations/20260806250000_qa_isolation_test_office.sql` — QA test office (`qa-isolation-test`)
- `supabase/migrations/20260806260000_qa_isolation_test_users.sql` — QA trainer/member for RPC tests
- `supabase/tests/cross_office_isolation_sim.sql` — 2-office content isolation checks
- `supabase/tests/cross_office_rpc_isolation.sql` — cross-office RPC isolation checks

### Remote apply note

Migrations were applied to production via Supabase MCP in smaller chunks; `schema_migrations.version` timestamps may not match repo filenames. Treat repo SQL as source of truth; use MCP `apply_migration` or reconcile before `supabase db push` on a fresh clone.

---

## Audit (2026-08-06)

| Area | Verdict |
|------|---------|
| Phase 0 spec | Aligned |
| Phase 1 DB + RLS | Correct — 1 office, 71 profiles, all `office_id` set, policies use `user_can_access_office()` |
| Phase 2 provisioning | Correct — RPC clones skills + content; pending admin email → `office_admin` |
| Phase 3 content | Correct — Prudence seeded (9 rules, 8 timetable, 5 pro reqs); pages load from DB |
| RPC leak (trainers cross-office) | **Fixed** — `admin_can_access_user()` on report/goal RPCs |
| Phase 5 signup | **Done** — `?office=slug` required; sponsor validated in-office; no orphan → prudence |
| Daily todo future dates | **Done** — future dates editable; past read-only |
| Phase 7 frontend | **Done** — office branding, `TenantAppSeo`, admin queries scoped via `tenantScope` |
| Phase 6 office admin | **Done** — invites, member approval, content editing at `/office-admin` |
| Phase 8 | **Done** — automated + RPC isolation passed; optional browser RLS QA remaining |
| Super admin cross-office | **Done** — `user_is_office_admin` bypass; `/office-admin?office=slug` switcher |
| Phase 8b | Code + `/apply` 320px spot-check **passed**; authenticated pages pending login QA |
| Phase 4 | Not started (expected) |
