# Current Goal — lifeos v1

Build a personal life-management web app at `~/Documents/lifeos/` combining Tiago Forte's PARA method with Scrum-style weekly sprints.

**Phase:** P4 PARA Views — **COMPLETE**, awaiting Codex tier C phase-end review.
**Next:** P5 Sprint + Kanban (sprint list, sprint detail with dnd-kit Kanban board, optimistic task moves, sprint planning view with capacity + area balance).

## P4 completion evidence

### Backend — unarchive routes
- `POST /api/{areas|projects|tasks|resources}/:id/unarchive` on all 4 archivable entities. Clears `archived_at` back to null. Ownership-scoped via `findFirstOrThrow`.
- New test `tests/routes.areas.test.ts` → `POST /:id/unarchive restores an archived area` (8/8 area tests passing, **71/71** total backend tests).

### Frontend infrastructure
- Installed `react-hook-form`, `@hookform/resolvers`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`, `vitest@^2`
- `apps/web/vitest.config.ts` + `src/tests/setup.ts` with jsdom environment, React plugin, `@testing-library/jest-dom/vitest` matchers

### Shared UI primitives (`components/ui/`)
- `button.tsx` — primary/secondary/ghost/danger variants, sm/md sizes
- `input.tsx` — Input, Textarea, Select, Label, Field (label + error slot)
- `modal.tsx` — dialog with ESC-to-close, backdrop click, accessible close button
- `empty-state.tsx` — reusable "no X yet" card with optional action
- `list-item-row.tsx` — reusable row with archived strike-through, actions slot
- `spinner.tsx` + `CenteredSpinner` — loading states
- `archive-toggle.tsx` — URL-param-backed `?includeArchived=true` toggle, **`useIncludeArchived()` hook** shared across all list pages

### Form error mapping
- `lib/form-errors.ts` — `mapApiErrorToForm(err, setError)` maps `ApiError.details` (Zod issue array) to per-field `setError` calls, returns any unmatched error as a `bannerError` string for a top-of-form banner

### Entity hooks (React Query)
Every hook imports from `@lifeos/shared` for types and calls `invalidateDashboard(queryClient)` in every mutation onSuccess — the canonical pattern established in P3 is now in active use.
- `use-areas.ts` — useAreas/useArea/useCreateArea/useUpdateArea/useArchiveArea/useUnarchiveArea
- `use-projects.ts` — same pattern + area_id, status filters
- `use-tasks.ts` — same pattern + project_id, area_id, sprint_id, status filters
- `use-resources.ts` — same pattern + area_id filter

### Forms (`components/forms/`)
- `area-form.tsx` — react-hook-form + `zodResolver(AreaCreateSchema)`, normalizes empty strings to null
- `project-form.tsx` — loads areas via `useAreas()` for the area picker; status enum dropdown; target_date field
- `task-form.tsx` — **XOR parent picker** via radio buttons (project vs area), corresponding `<Select>` switches based on pick, urgency/importance dropdowns with `Controller`, client-side XOR guard before network round-trip, server XOR errors mapped to banner
- `resource-form.tsx` — kind dropdown (note/url/clipping), URL field with Zod `.url()` validation, body_md textarea

### Pages — full CRUD with URL-param filters
- `areas-page.tsx` — list + modal create + archive toggle
- `area-detail-page.tsx` — read view with projects/tasks/resources sections + edit modal + archive/restore
- `projects-page.tsx` — list + modal create + area filter (URL param `?area=`) + status filter (URL param `?status=`) + archive toggle
- `project-detail-page.tsx` — read view with stat grid + child tasks + edit modal
- `tasks-page.tsx` — list + modal create + status filter + archive toggle
- `task-detail-page.tsx` — read view with full stat grid + edit modal with XOR handling
- `resources-page.tsx` — list + modal create + archive toggle
- `resource-detail-page.tsx` — read view with URL (clickable) + body_md display + edit modal

### Routing
- `App.tsx` extended with 4 new detail routes: `/areas/:id`, `/projects/:id`, `/tasks/:id`, `/resources/:id`

### RTL smoke test
- `src/tests/areas-page.test.tsx` — **3 tests passing**:
  - Renders page header and "New area" button on empty list
  - Renders area names from mocked API response
  - Shows empty state when no areas exist
- Global `fetch` mocked per test; `QueryClientProvider` + `MemoryRouter` wrappers shared

### Verification
- `pnpm -r typecheck` clean across all 3 workspaces ✅
- `pnpm --filter api test` — 71/71 backend tests passing (was 70; new unarchive test added) ✅
- `pnpm --filter web test` — 3/3 RTL smoke tests passing ✅
- Manual end-to-end curl smoke:
  - Created Area "Health" with color + description ✅
  - Created Project "Run a 5k" under area ✅
  - Created Task "Buy running shoes" under project with urgency=2, importance=3 → `priority_score=6` (Eisenhower 2*1.5 + 3) ✅
  - Created standalone Task "Drink more water" under area (the other XOR branch) ✅
  - POST a task with no parent → 422 (XOR enforcement) ✅
  - DELETE project → default list 0, `?includeArchived=true` list 1 ✅
  - POST `/projects/:id/unarchive` → default list back to 1 ✅

### Codex P3 advisory coverage
- ✅ CRUD + archive for Areas, Projects, Tasks, Resources
- ✅ Archived hidden by default, revealed by toggle
- ✅ Sort/filter state in URL (`?includeArchived`, `?area`, `?status`) — survives refresh
- ✅ Forms use shared Zod-backed validation (react-hook-form + zodResolver)
- ✅ Inline field errors + top-of-form banner from mapped server errors
- ✅ Unarchive path explicit (POST /:id/unarchive)
- ✅ Standardized query param names: `includeArchived`, `area`, `status`
- ✅ Standardized archive toggle behavior (`useIncludeArchived` hook) across all list views
- ✅ `pnpm -r typecheck` passes after P4 changes
- ✅ At least one RTL smoke test covers a P4 list flow and passes (areas-page, 3 tests)

### Deviation log (P4)
- Project hierarchy (parent_id tree display) intentionally deferred — projects-page shows a flat list. Re-parenting from the UI is v1.1. The schema supports it, the detail view shows parent_id as metadata, but the tree UI would be extra scope. Project detail page links to parent/children are a small refinement for later.
- Task form's `estimate_minutes` uses `setValueAs` to coerce empty string → null since HTML number inputs can submit empty strings.
- Areas page sort/filter is currently just the archive toggle (no per-field sort). Sort bar across all list views deferred to a small refinement phase — the URL-param pattern is in place.
