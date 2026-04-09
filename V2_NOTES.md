# lifeos — v2 Next Steps

Notes for when you come back to lifeos. These are the items deferred during v1 planning plus observations collected while building.

## Deferred from the v1 plan (in rough priority order)

1. **Memory / reminder engine.** The "I'm constantly forgetting things" core ask that motivated the whole project. v1 gives you the data substrate (dashboard, stale-task widget, due-today widget) but doesn't proactively surface anything. v2 should add some combination of:
   - Push/desktop notifications at configurable times
   - A "daily brief" email or in-app popup at a user-chosen time
   - Smarter stale detection that weighs urgency/importance against last-updated
   - "What did I say I'd do this week?" review prompt on Saturday afternoon

2. **Real auth + multi-user.** The 1-line JWT bolt-on recipe is already documented in `ARCHITECTURE.md`. Most of the work is frontend (login/register pages, auth store, request interceptor). Backend is additive only — no existing route changes.

3. **Self-hosted deployment.** Once auth is in, you can reach lifeos from your phone. Needs:
   - Dockerfile for the API (not just Postgres)
   - Reverse proxy (Caddy is simplest — auto-TLS)
   - A small guide for running it on a VPS or home server
   - PWA manifest so you can install it to the phone home screen

4. **Smart prioritization beyond Eisenhower.** The `priority_score` float column exists on Tasks and Projects as the future-model slot. You can replace the `computePriorityScore()` function in `apps/api/src/lib/prioritize.ts` without any schema change. Ideas:
   - Weighted function including due-date proximity, sprint pressure, estimate size, and age
   - "Quick wins first" mode (short estimate × high importance)
   - Eisenhower as one mode, weighted as another, user-togglable

5. **Rich text editor.** Currently `body_md` is a plain textarea. Options: milkdown, lexical, tiptap. Keep markdown as the storage format so existing data stays valid.

6. **Recurring tasks.** A task that regenerates on a schedule (daily water, weekly dishes, monthly rent). Probably implemented as a `recurring_task_template` table + a scheduled job that materializes concrete Task rows on the right days.

7. **CI pipeline (GitHub Actions).** Runs `pnpm test` + `pnpm typecheck` on every push. Trivial to set up; v1 skipped it because single-user local-only doesn't justify the maintenance.

## Refinements noted during v1 (smaller than the above, but flagged)

- **`useEntityTags` hook is O(tag_count).** It fetches all tags then asks each one's entities to compute "which tags are on this entity". Acceptable at single-user scale but a dedicated `GET /api/entities/{type}/{id}/tags` endpoint would fix it.

- **Project hierarchy tree UI.** v1 shows a flat list of projects with `parent_id` stored but not rendered as a tree. The schema supports nesting; just needs a tree component.

- **Sort bar per list view.** The URL-param contract (`?sort=`, `?order=`) is in place but only archive-toggle uses it. A generic `<SortBar>` component would unlock sorting on every list.

- **Kanban sort_order rebalance job.** If the gap between two cards ever drops below 2 (pathological case requiring dozens of within-column reinserts between the same pair), reordering silently corrupts. A one-line admin endpoint that renumbers a column's tasks to multiples of 1000 would fix it. Single-user hand-dragging is very unlikely to hit this.

- **Dashboard `weeklyFocusByArea` ignores archived areas.** If you archive an area, tasks that transitively reference it stop contributing to the focus count. This is probably correct behavior but worth revisiting if it feels wrong in daily use.

- **`relation_type` UI.** The whitelist is `references | blocks | depends_on`, but the link picker only lets you create `references` links. A dropdown to pick the relation type would expose the full feature.

- **Sprint status auto-transitions.** Sprints are manually toggled `planned → active → complete`. You could auto-activate on the Sunday of the sprint's week and auto-complete on the following Sunday.

## Things NOT to do in v2 (explicitly)

- **Don't add a Notion importer.** You said you don't need it.
- **Don't add analytics or telemetry.** It's a personal app.
- **Don't add per-task time tracking beyond the static `estimate_minutes` field** unless you actually want a Pomodoro-style workflow — that's a different product.

## Starting point for v2 planning

When you come back:
1. Read this file
2. Read `ARCHITECTURE.md` to reload the mental model (especially the ADR sections)
3. Read `agent/current_goal.md` for the v1-done summary
4. Decide on one item from the deferred list (memory/reminders is the highest-leverage pick) and plan that scope only — don't try to do several at once
5. Run `/plan` fresh for whatever you pick — the tier C review cadence worked well for v1 and should carry over

## Current state snapshot (v1 done)

- **107 tests passing** (93 backend integration + 14 frontend RTL)
- `pnpm -r typecheck` clean across 3 workspaces
- Nine commits on `origin/main`: P0 → P8
- Running via `docker compose up -d postgres && pnpm dev`
- All ADRs documented in `ARCHITECTURE.md`
- All raw SQL constraints guarded by `schema-constraints.test.ts`
- Polymorphic integrity guarded by `integrity.test.ts`
