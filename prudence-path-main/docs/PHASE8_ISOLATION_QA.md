# Phase 8 — Cross-Office Isolation QA

Manual checklist before multi-tenant GA. Run with **two test offices** (e.g. `prudence` + a provisioned test office).

## Automated verification (production)

Run `supabase/tests/multi_tenant_isolation_verify.sql` via SQL editor or MCP.

**Last run: 2026-08-06 — ALL PASSED**

- Internal RPCs (`clone_office_content`, `generate_weekly_report`, `calculate_monthly_actuals`) not granted to `authenticated`
- Public wrappers callable; signup helpers granted to `anon`
- Zero profiles with null `office_id`
- Zero `daily_activities` office_id mismatches vs profiles
- `handle_new_user` requires office invite
- `admin_can_access_user` present
- Future-date todo support in `is_todo_date_editable`

### Cross-office simulation (2-office content clone)

Run `supabase/tests/cross_office_isolation_sim.sql` after migration `20260806250000_qa_isolation_test_office.sql`.

**Last run: 2026-08-06 — ALL 8 CHECKS PASSED**

| Check | Result |
|-------|--------|
| `qa-isolation-test` office exists | pass |
| Cloned rule sections (9) | pass |
| Cloned skills (8) | pass |
| No shared content IDs across offices | pass |
| Sponsor downlines stay in-office | pass |
| QA office has zero members (clean slate) | pass |
| Rule counts match prudence ↔ qa | pass |
| Skills counts match prudence ↔ qa | pass |

### Cross-office RPC isolation

Run `supabase/tests/cross_office_rpc_isolation.sql` after `20260806260000_qa_isolation_test_users.sql`.

**Last run: 2026-08-06 — ALL PASSED**

| Test | Expected | Result |
|------|----------|--------|
| `admin_can_access_user` qa trainer → qa member | true | pass |
| `admin_can_access_user` prudence trainer → qa member | false | pass |
| `users_share_office` cross-office | false | pass |
| `get_or_generate_monthly_goal` cross-office | `not allowed` | pass |
| `get_or_generate_weekly_report_for_week` cross-office | `not allowed` | pass |
| `get_or_generate_monthly_goal` same-office qa trainer → qa member | succeeds | pass |

## Setup

**Option A — QA test office (fast):**

- [x] `qa-isolation-test` office provisioned (skills + content cloned from prudence)
- [x] QA test users seeded (`qa_trainer`, `qa_member` in `qa-isolation-test`)
- [x] Cross-office RPC isolation verified (see below)
- [ ] Optional browser RLS spot-check with QA credentials

**Option B — Full provision flow:**

- [ ] Provision test office via `/admin-office-applications`
- [ ] Create trainer + member in each office (different emails)
- [ ] Note user UUIDs for cross-access RPC tests

## Signup & invites

- [ ] Signup without `?office=` is blocked (UI + DB)
- [ ] Invalid office slug rejected
- [ ] Sponsor from another office rejected on signup
- [ ] Invite link `?office=slug&sponsor=user` works

## RLS — read isolation

Log in as **Office A trainer**, attempt via browser devtools / Supabase client:

- [ ] Cannot SELECT Office B `profiles` by UUID
- [ ] Cannot SELECT Office B `daily_activities`
- [ ] Cannot SELECT Office B `office_rule_sections`
- [ ] Sponsor downlines do not include other-office usernames

## RPC isolation

As Office A trainer, call with Office B member UUID:

- [x] `get_or_generate_monthly_goal` → `not allowed` (automated 2026-08-06)
- [x] `get_or_generate_weekly_report_for_week` → `not allowed` (automated 2026-08-06)

## Admin UI scope

- [ ] Trainer Admin Skills list shows only own-office skills
- [ ] Admin Monthly Goals member list office-scoped (trainer); super_admin sees all
- [ ] Income overview office-scoped for trainers

## Office admin console

- [ ] `/office-admin` hidden from members/trainers
- [ ] Content edits in Office A not visible in Office B
- [ ] Member approve/reject only affects own office
- [ ] `clone_office_content` not callable by regular users

## Branding

- [ ] Navbar shows office name when logged in
- [ ] Dashboard subtitle includes office name
- [ ] App page titles use office name suffix

## Responsive (Phase 8b)

Test `/office-admin`, `/admin-office-applications`, `/apply`, `/admin-offices` at: 320, 375, 768, 1024, 1280px.

**Code review + production spot-check (2026-08-06):** All four pages use mobile-first Tailwind (`grid-cols-1`, `sm:`/`lg:` breakpoints, full-width buttons on narrow viewports). `/apply` verified at 320px on production. Authenticated pages require login for full visual QA — layout patterns match existing app conventions.
