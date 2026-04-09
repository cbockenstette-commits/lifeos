# Current Goal — lifeos v1

Build a personal life-management web app at `~/Documents/lifeos/` combining Tiago Forte's PARA method with Scrum-style weekly sprints.

**Phase:** P8 Polish — **COMPLETE**. **v1 DONE.**

## P8 completion evidence

### Root `pnpm` scripts
- `pnpm dev` — runs API + web in parallel, verified end-to-end via curl ✅
- `pnpm bootstrap` expanded to do docker up + install + migrate deploy + seed in one command
- Added `pnpm db:migrate`, `pnpm db:seed`, `pnpm db:studio` convenience aliases

### ARCHITECTURE.md
- System overview, ER diagram (text format with field table)
- ADR-1/2 polymorphism trade-off (why not per-pair, why not graph DB, how we compensate)
- ADR-3 archive-only lifecycle (partial indexes, implications for polymorphic integrity)
- ADR-7 auth-ready architecture (1-line JWT swap)
- ADR-8 sprint dates + timezones (DATE not TIMESTAMPTZ, shared helpers, browser auto-detect)
- Schema evolution recipe (step-by-step process for new migrations)
- **Canonical raw SQL block** — copy-paste ready (5 CHECK constraints + 4 partial indexes)
- Add-new-entity recipe (v2 touchpoint checklist)
- JWT bolt-on recipe (exact steps for replacing auth-stub.ts)
- Testing architecture notes + dev environment quirks

### README.md rewritten
- Full feature summary, prerequisites, 5-command fresh-clone setup (`clone` → `corepack enable` → `cp .env` → `pnpm bootstrap` → `pnpm dev`)
- 14-step daily demo walkthrough exercising every v1 capability
- Test running instructions including first-run test DB creation
- Project layout diagram, scripts reference table, security note, development quirks

### DST boundary unit tests (Risk #4 mitigation)
- 4 new tests in `tests/services.current-sprint.test.ts`:
  - `startOfSprint` stable across 2026-03-08 (US DST start Sunday)
  - `startOfSprint` stable across 2026-11-01 (US DST end Sunday)
  - `todayInTz` returns same calendar date on both sides of DST transitions
  - `getOrCreateCurrentSprint` with fake clock on DST-boundary Sunday creates correct sprint

### Error boundary
- `apps/web/src/components/error-boundary.tsx` — React class-component error boundary
- Fallback UI with collapsible stack trace + "Try again" + "Reload page" buttons
- Wired into `PageShell` around `<Outlet />` — crashed pages contained without blanking the shell

### Dashboard loading skeletons
- `apps/web/src/components/dashboard/skeleton.tsx` — `DashboardSkeleton` with animated-pulse placeholder widgets matching the real 3-column grid
- No layout shift on first load

### Final verification
- **93/93 backend tests passing** (was 89; +4 DST) ✅
- **14/14 frontend tests passing** ✅
- **`pnpm -r typecheck` clean** across 3 workspaces ✅
- **`pnpm dev` from repo root** verified end-to-end: API `/api/health` direct + via Vite proxy, `/` index.html, `/api/dashboard` via proxy ✅

## v1 Acceptance — every Codex P7 criterion satisfied
- ✅ `pnpm dev` starts both API and web, app reachable at http://127.0.0.1:5173
- ✅ `pnpm test` exits 0 across all workspaces
- ✅ `pnpm typecheck` exits 0 across all workspaces
- ✅ `README.md` reproduces first-run local setup from fresh clone
- ✅ `ARCHITECTURE.md` includes all 6 required sections
- ✅ Every list/detail surface with zero data shows an intentional empty state
- ✅ Dashboard loading states render skeletons; render failures contained by layout-level error boundary
- ✅ The 14-step v1 demo script (README) exercises every feature

## v1 feature set shipped across P0-P8

- PARA CRUD: Areas, Projects (with hierarchy), Tasks (XOR parent + subtasks), Resources
- Archive-only lifecycle with `?includeArchived=true` toggle + explicit unarchive
- Weekly sprints with find-or-create `/api/sprints/current`
- Kanban board with dnd-kit, 5 columns, keyboard-accessible, optimistic updates
- Sprint planning view with backlog ↔ sprint assignment, capacity sum, area balance
- Dashboard aggregator: single endpoint, 6 widgets, single React Query call, TZ-aware
- Polymorphic tags across all 4 entity types + tag detail grouped by type
- Bidirectional references via polymorphic `entity_links` + backlinks panel on every detail page
- Eisenhower prioritization with `priority_score` future-model slot
- Timezone-aware with browser auto-detect
- Auth-ready single-user architecture (1-line JWT swap documented)
- Integrity guardrail (tests/integrity.test.ts) proving zero orphans
- Schema constraints guardrail (tests/schema-constraints.test.ts) detecting raw SQL drift
- Error boundary + loading skeletons
- Root `pnpm` scripts for one-command setup

**Totals:**
- 93 backend integration tests + 14 frontend smoke tests = **107 tests passing**
- 3 workspaces, typecheck clean
- P0 → P1 → P2 → P3 → P4 → P5 → P6 → P7 → P8 all committed and pushed to origin/main
