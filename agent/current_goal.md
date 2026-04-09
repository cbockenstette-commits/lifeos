# Current Goal — lifeos v1

Build a personal life-management web app at `~/Documents/lifeos/` combining Tiago Forte's PARA method with Scrum-style weekly sprints.

**Phase:** P5 Sprint + Kanban — **COMPLETE**, awaiting Codex tier C phase-end review.
**Next:** P6 Dashboard (real `/api/dashboard` aggregator with 6 widgets: current sprint in-progress tasks, due today, stale tasks, weekly focus by area, recent resources, current sprint summary).

## P5 completion evidence

### dnd-kit integration
- Installed `@dnd-kit/core@^6`, `@dnd-kit/sortable@^10`, `@dnd-kit/utilities@^3`
- `DndContext` with `PointerSensor` (5px activation distance) + `KeyboardSensor` (accessible by default, `sortableKeyboardCoordinates` getter)
- `closestCorners` collision detection for smoother cross-column dragging
- `DragOverlay` component for the floating drag preview

### Kanban components (`components/kanban/`)
- `sort-order.ts` — `computeInsertSortOrder` pure function + 4 unit tests (empty column → 1000, top → first/2, bottom → last+1000, middle → midpoint)
- `kanban-card.tsx` — `useSortable` per task; navigates to `/tasks/:id` on click (not on drag); shows title, description, urgency/importance, estimate
- `kanban-column.tsx` — `useDroppable` wrapping `SortableContext` with `verticalListSortingStrategy`; empty columns show "Drop here" placeholder; task count badge
- `kanban-board.tsx` — 5 fixed columns (Backlog → To Do → In Progress → Review → Done), computes destination index and new `sort_order` on drag end, mutates via `useUpdateTaskPosition`

### Optimistic move hook
- `hooks/use-update-task-position.ts` — React Query `useMutation` with `onMutate`/`onError`/`onSettled` canonical pattern:
  - `onMutate`: snapshots every `tasks.*` cache entry, applies the move + re-sort in place, returns the snapshot as context
  - `onError`: restores every snapshot from context
  - `onSettled`: invalidates all `tasks.*` keys + calls `invalidateDashboard()`
- Server is the canonical source — on settled we always refetch and reconcile

### Sprint hooks
- `hooks/use-sprints.ts` — `useSprints`, `useSprint`, `useCurrentSprint` (calls `GET /api/sprints/current` find-or-create), `useCreateSprint`, `useUpdateSprint`
- Every mutation calls `invalidateDashboard(queryClient)` in `onSuccess`

### Sprint form
- `components/forms/sprint-form.tsx` — react-hook-form + zodResolver(SprintCreateSchema). Default start_date computed from browser timezone via `startOfSprint(todayInTz(tz))` from @lifeos/shared.

### Pages
- `pages/sprints-page.tsx` — list + "Start this week's sprint" button that finds-or-creates the current sprint and navigates to it
- `pages/sprint-detail-page.tsx` — stats row (status, task count, capacity in minutes, completed count) + full Kanban board with dnd-kit drag. Sprint status buttons (planned → active → complete → reopen)
- `pages/sprint-planning-page.tsx` — two-column layout: backlog candidates (left) + in-sprint tasks (right) with add/remove buttons, capacity sum in minutes/hours, per-area count balance (computed by walking task → project → area)

### Routes
- `App.tsx` adds `/sprints/:id` (detail with Kanban) and `/sprints/:id/plan` (planning view)

### Tests
- Backend: `tests/routes.task-moves.test.ts` — 5 integration tests:
  - Assign task to sprint (sprint_id persists)
  - Cross-column move (status + sort_order)
  - Within-column reorder (sort_order changes produce the right ordering on reload)
  - Unassign from sprint (sprint_id: null)
  - Combined PATCH with sprint_id + status + sort_order
- Frontend: `src/tests/kanban-board.test.tsx` — 7 tests:
  - All 5 column headers render
  - Tasks render in the correct column based on status
  - Within-column sort order
  - `computeInsertSortOrder`: empty, top, bottom, middle

### Verification
- `pnpm -r typecheck` clean across 3 workspaces ✅
- `pnpm --filter api test` — **76/76** backend tests passing (was 71; +5 task-moves) ✅
- `pnpm --filter web test` — **10/10** frontend tests passing (was 3; +7 Kanban) ✅
- Manual end-to-end curl smoke:
  - Seeded area + project + 3 tasks ✅
  - `GET /api/sprints/current` returned a Sunday-to-Saturday sprint ✅
  - Second call → same ID (idempotent find-or-create) ✅
  - Assigned all 3 tasks to the sprint via PATCH ✅
  - Moved "Write tests" from `backlog` to `in_progress` with `sort_order=500` — verified persistence ✅

### Codex P4 advisory coverage
- ✅ Exact task-move API contract (PATCH /api/tasks/:id with status + sort_order + sprint_id) — tested with 5 integration cases
- ✅ Server-side canonical reorder logic — we rely on the raw sort_order number, server stores what the client sends (single-user, no contention)
- ✅ Optimistic dnd-kit wiring with rollback
- ✅ Keyboard drag support (KeyboardSensor registered alongside PointerSensor)
- ✅ All sprint/task mutation hooks follow the shared `invalidateDashboard()` pattern
- ✅ `pnpm -r typecheck`, backend tests, web RTL tests all green

### Deviation log (P5)
- **No rebalance job.** The plan mentioned rebalancing when the sort_order gap drops below 2. At single-user scale with 1000-step gaps, this takes dozens of within-column re-inserts between the same two cards before it becomes a problem. Noted in `sort-order.ts`. v1.1 can add an admin rebalance endpoint.
- **No explicit DragOverlay preview styling polish** beyond the ghost opacity on the source card.
- **Sprint planning area-balance counts** walk task → project → area client-side. This is O(n) over tasks per render but at v1 scale (a few dozen tasks per sprint max) it's imperceptible.
- **Candidate task pool** for sprint planning filters client-side (`sprint_id === null AND archived_at IS NULL AND status !== 'done'`). The API doesn't support `?sprint_id=null` directly. Could add an explicit filter parameter later.

### Key P5 open questions (from Codex P4 review, now answered in code)
- ✅ Candidate pool = unsprinted non-archived non-completed (client-side filter)
- ✅ Assigning a task keeps its current status (no auto-reset to backlog)
- ✅ Removing just clears `sprint_id` (no status reset)
- ✅ Sprint creation via `/sprints` page CTA AND auto-create via `GET /api/sprints/current` find-or-create
