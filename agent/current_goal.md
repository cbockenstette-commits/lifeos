# Current Goal — lifeos v1

Build a personal life-management web app at `~/Documents/lifeos/` combining Tiago Forte's PARA method with Scrum-style weekly sprints.

**Phase:** P6 Dashboard — **COMPLETE**, Codex tier C review APPROVED.
**Next:** P7 Tags + References (polymorphic tag CRUD, tag detail page grouped by type, entity-link picker modal, backlinks panel on every detail page, integrity test for polymorphic FKs).

## P6 completion evidence

### Shared schema
- `packages/shared/src/schemas/dashboard.ts` — `DashboardSchema` + `AreaFocusSchema`. Every widget field has an explicit shape; empty widgets return `[]`, not `null`.

### Backend aggregator
- `apps/api/src/services/dashboard.ts` — `buildDashboard(prisma, userId, timezone, now)`:
  - Calls `getOrCreateCurrentSprint` so the dashboard always has a sprint to point at
  - Runs 7 Prisma queries in parallel via `Promise.all` on the shared client
  - `dueToday`: `due_date <= endOfToday in user TZ` AND `status NOT IN ('done')` AND `archived_at IS NULL`
  - `staleTasks`: `updated_at < now - 14 days` AND `status NOT IN ('done', 'backlog')` — excluding backlog is a deliberate improvement over the plan (an untouched backlog task isn't "stale", it was never started)
  - `inProgressTasks`: tasks in current sprint with `status='in_progress'`
  - `weeklyFocusByArea`: tasks in current sprint OR with `due_date` inside the week window; grouped by area resolved directly OR transitively via project → area
  - `recentResources`: top 5 by `created_at DESC`, excluding archived
  - All date math uses `todayInTz` / `startOfSprint` / `endOfSprint` from `@lifeos/shared` — same helpers as sprint logic, so timezone behavior is consistent

### Backend — date coerce helper (latent P4 bug found + fixed)
- `apps/api/src/lib/coerce.ts` — `toDate()` converts string/Date/null/empty-string → Date|null
- Applied to task and project routes for `due_date`, `target_date`, `completed_at`
- **The bug:** Prisma's `@db.Date` columns reject raw string input. `POST /api/tasks { due_date: '2026-04-08' }` was silently returning 500. Now tasks accept ISO date strings from clients and convert at the Prisma boundary.

### Frontend
- `hooks/use-dashboard.ts` — single React Query hook with `queryKey: ['dashboard']`, 30s staleTime, refetch on window focus
- `components/dashboard/` — Widget, TaskList, CurrentSprintSummary, AreaFocusWidget, RecentResourcesWidget
- `pages/dashboard-page.tsx` — composes all 6 widgets from one `useDashboard()` call; 3-column grid on large screens

### Tests
- **Backend** `tests/routes.dashboard.test.ts` — **9 tests** covering empty DB, each widget's filter logic, timezone handling, and performance
- **Frontend** `src/tests/dashboard-page.test.tsx` — **2 tests**: full-payload render with **exactly 1 /api/dashboard fetch call** + empty-payload render

### Verification
- `pnpm -r typecheck` clean ✅
- Backend: **85/85** tests (was 76; +9 dashboard) ✅
- Frontend: **12/12** tests (was 10; +2 dashboard) ✅
- Manual curl end-to-end:
  - Empty dashboard returns all 6 sections with empty arrays + find-or-create sprint ✅
  - Populated dashboard shows inProgressTasks, weeklyFocusByArea aggregation (2 tasks, 105 min), recentResources ✅
  - Timezone handling verified: task with `due_date: '2026-04-09'` (UTC tomorrow) correctly excluded from dueToday when user is in Boise (April 8 local) ✅

### Codex tier C review: APPROVED
- blocking_issues=[]
- All open questions pre-answered in the implementation:
  - Dashboard currentSprint find-or-creates (plan path)
  - recentResources strictly `created_at DESC`
  - weeklyFocusByArea counts all (not just incomplete) tasks in current sprint + week window

### Deviation log (P6)
1. **Date coerce helper `lib/coerce.ts`** — not in the original plan but required by a latent P4 bug where Prisma's `@db.Date` columns rejected raw string input.
2. **`Promise.all` rather than `prisma.$transaction`** — the plan mentioned transaction-batched reads, but `$transaction([...])` serializes queries within a transaction. `Promise.all` on the shared Prisma client lets the connection pool parallelize them, which is what we want for read-only aggregation.
3. **`staleTasks` widget uses shared `TaskList`** — no dedicated "stale warnings" component needed.
