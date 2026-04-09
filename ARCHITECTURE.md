# lifeos Architecture

This is the single source of truth for lifeos's architectural decisions. It complements `README.md` (setup/operations) with the "why" behind the code.

## Contents

- [System overview](#system-overview)
- [Entity model (ER diagram)](#entity-model-er-diagram)
- [ADR-1/2: Polymorphic references + tags trade-off](#adr-12-polymorphic-references--tags-trade-off)
- [ADR-3: Archive-only lifecycle](#adr-3-archive-only-lifecycle)
- [ADR-7: Auth-ready single-user architecture](#adr-7-auth-ready-single-user-architecture)
- [ADR-8: Sprint dates and timezones](#adr-8-sprint-dates-and-timezones)
- [Schema evolution recipe](#schema-evolution-recipe)
- [Canonical raw SQL block](#canonical-raw-sql-block)
- [Add a new entity type (v2 recipe)](#add-a-new-entity-type-v2-recipe)
- [Enable real auth (JWT bolt-on recipe)](#enable-real-auth-jwt-bolt-on-recipe)

---

## System overview

lifeos is a pnpm workspace monorepo with three workspaces:

```
apps/
├── api/       Fastify + Prisma + PostgreSQL 16 (backend, binds 127.0.0.1:3000)
└── web/       Vite + React + TypeScript + Tailwind (frontend, dev on 127.0.0.1:5173)

packages/
└── shared/    Zod schemas, enums, pure helpers used by both apps
```

**Key principle:** `packages/shared` is the wire contract. Every entity has hand-written Zod schemas that both the API (via `fastify-type-provider-zod`) and the web app (via `react-hook-form` + `@hookform/resolvers/zod`) consume. Prisma types stay inside `apps/api`; the frontend never imports `@prisma/client`.

---

## Entity model (ER diagram)

```
User ──┬── Area ──┬── Project ──── Task ──┬── Sprint
       │          │       ▲               │
       │          │       │ parent_id     │ parent_id
       │          │       └───────────────┘
       │          └── Resource
       │
       └── Tag

EntityLink (polymorphic):
  source_type × source_id  ──▶  target_type × target_id
    (area|project|task|resource)

EntityTag (polymorphic):
  tag_id ──▶  entity_type × entity_id
               (area|project|task|resource)
```

### Models

| Model | Key fields | Notes |
|---|---|---|
| **User** | `id, email, name, timezone, created_at, updated_at` | Single row in v1. Every other table has `user_id FK` from day one. |
| **Area** | `name, description, color, archived_at` | Ongoing life domain. Hosts Projects. |
| **Project** | `name, status, target_date, priority_score, parent_id, area_id, archived_at, completed_at` | Completable. Self-ref hierarchy via `parent_id`. |
| **Task** | `title, status, urgency, importance, priority_score, estimate_minutes, due_date, sort_order, sprint_id, parent_id, project_id, area_id, archived_at, completed_at` | **True XOR on `(project_id, area_id)`** enforced by raw SQL CHECK. Self-ref hierarchy for subtasks. |
| **Resource** | `title, url, body_md, source_kind, area_id, archived_at` | Reference material: note/url/clipping. |
| **Sprint** | `start_date, end_date, status, goal` | Always Sunday→Saturday. `UNIQUE(user_id, start_date)` prevents double-create. `sprint_week_check` CHECK enforces 6-day duration. |
| **Tag** | `name, color` | `UNIQUE(user_id, name)`. |
| **EntityTag** | `tag_id, entity_type, entity_id` | Polymorphic join. No FK on `entity_id`. |
| **EntityLink** | `source_type, source_id, target_type, target_id, relation_type` | Polymorphic edges. `entity_link_no_self` + `entity_link_relation_check` CHECKs. |

### `EntityType` enum scope

`EntityType` covers **`area | project | task | resource`** only. Sprint is **intentionally excluded** from polymorphic tags and links — sprints are ephemeral weekly containers, not "forever" objects you reference or tag. v2 may revisit.

---

## ADR-1/2: Polymorphic references + tags trade-off

**Question:** How to store "any entity can reference or be tagged by any other entity" without creating 15+ junction tables?

**Decision:** Single polymorphic `entity_links` table with `(source_type, source_id, target_type, target_id, relation_type)` and a matching `entity_tags` table with `(tag_id, entity_type, entity_id)`. No DB-level foreign keys on the polymorphic ID columns.

**Why not per-pair junction tables?** With 4 entity types you'd need C(4,2)+4 = 10 link tables and 4 tag tables, PLUS every backlinks query becomes a 4-way `UNION ALL`. Adding a new entity type doubles the table count. It doesn't scale to "any entity can link to any entity".

**Why not a graph database sidecar?** Overkill for single-user local-only v1. Violates the stack lock. Dual-write consistency problem is real and gives you nothing for the one-hop queries lifeos actually runs.

**What we lose:** DB-level foreign key enforcement on `source_id` / `target_id` / `entity_id`.

**How we compensate:**
1. **`assertEntityExists(type, id)` on every create path** — the `entity-links` service and tag attach route both call it before writing. A request pointing at a non-existent target returns 404, never writes.
2. **`tests/integrity.test.ts`** — runs raw SQL `LEFT JOIN` checks against every entity type, asserts zero orphan rows. Runs on every test suite execution.
3. **Archive-only lifecycle** (ADR-3) — no hard-delete path exists in the v1 API. A link can only become an orphan via manual SQL tampering, and the integrity test catches that.
4. **`source_type` / `target_type` / `entity_type` are Prisma enums** (`EntityType`) — the database rejects unknown values at write time.

**Hydration pattern:** When rendering a backlinks panel or tag detail, the service resolves polymorphic refs via `services/hydrate.ts::hydrateEntities()`, which groups refs by type and issues **one `findMany` per distinct type** — never N queries for N refs. Tests assert this batching invariant.

---

## ADR-3: Archive-only lifecycle

**Decision:** v1 exposes NO hard-delete path through the API. `DELETE /api/{entity}/:id` sets `archived_at`, returning the archived row. `POST /api/{entity}/:id/unarchive` clears it.

**Tag is the one exception:** tags are pure metadata and `DELETE /api/tags/:id` does a hard delete (cascades `EntityTag` rows via Prisma `onDelete: Cascade`).

**Filter enforcement:** every list route calls `applyArchivedFilter(where, query)` from `services/archive.ts`. Default behavior hides archived rows; `?includeArchived=true` opts out.

**Partial indexes** on Area, Project, Task, Resource make the default filter fast:

```sql
CREATE INDEX "idx_Area_active"     ON "Area"     (user_id) WHERE archived_at IS NULL;
CREATE INDEX "idx_Project_active"  ON "Project"  (user_id) WHERE archived_at IS NULL;
CREATE INDEX "idx_Task_active"     ON "Task"     (user_id) WHERE archived_at IS NULL;
CREATE INDEX "idx_Resource_active" ON "Resource" (user_id) WHERE archived_at IS NULL;
```

**Implication for polymorphic integrity:** because there's no hard-delete path, links and tags referencing archived entities stay in the DB. The hydrator filters archived entities out of the displayed result by default (so the backlinks panel hides archived references), but the underlying rows persist so you can unarchive and they reappear.

---

## ADR-7: Auth-ready single-user architecture

**Decision:** v1 has no authentication gate but is *structurally* auth-ready. Swapping to real auth is a 1-line change in `apps/api/src/plugins/auth-stub.ts`.

**How it works:**
1. Every user-owned table has `user_id UUID NOT NULL` from day one.
2. `apps/api/src/config.ts` exports `LOCAL_USER_ID` — the hard-coded UUID of the seeded local user.
3. `apps/api/src/plugins/auth-stub.ts` adds a `preHandler` hook that sets `request.user = { id: LOCAL_USER_ID }`.
4. Every route reads `req.user.id` — never a global, never hardcoded.
5. Fastify binds `127.0.0.1` only, so the app is unreachable from outside localhost.

**v2 upgrade path:** see [Enable real auth](#enable-real-auth-jwt-bolt-on-recipe) below.

---

## ADR-8: Sprint dates and timezones

**Decision:** Sprint dates are `DATE` columns (not `TIMESTAMPTZ`). The user's timezone lives on `users.timezone` (IANA string, defaults to `America/Boise`). All date math goes through shared helpers in `packages/shared/src/schemas/sprint.ts`.

**Why DATE not TIMESTAMPTZ for sprints:** a sprint is "Sunday through Saturday as calendar dates". Using `DATE` sidesteps DST entirely — a calendar date does not move when clocks change.

**Canonical helpers** (shared by both API and frontend):
- `todayInTz(timezone: string, now?: Date): string` — returns `YYYY-MM-DD` for the user's timezone
- `startOfSprint(ymd: string): string` — Sunday on or before the given date
- `endOfSprint(startYmd: string): string` — Saturday 6 days after

**`UNIQUE(user_id, start_date)`** constraint prevents double-create races on `GET /api/sprints/current` (find-or-create).

**Browser timezone auto-detect:** `useCurrentUser` hook reads `Intl.DateTimeFormat().resolvedOptions().timeZone` on first successful load. If it differs from the stored value, it `PATCH /api/users/me` once per session. This lets the app self-correct when the user works from a different location than their default.

---

## Schema evolution recipe

**Goal:** keep the raw SQL block (CHECK constraints, partial indexes) alive across future migrations. Prisma does not carry these forward automatically.

**When you change `apps/api/prisma/schema.prisma`:**

1. Edit `schema.prisma` with your changes.
2. Run:
   ```bash
   pnpm --filter api prisma migrate dev --name <describe_change>
   ```
3. **Open the new migration file** at `apps/api/prisma/migrations/<timestamp>_<name>/migration.sql`.
4. **If your change touched `Task`, `Sprint`, `EntityLink`, or any of Area/Project/Task/Resource's archival indexes,** append the relevant subset of the [Canonical raw SQL block](#canonical-raw-sql-block) below to the bottom of the new migration file.
5. Re-run:
   ```bash
   pnpm --filter api prisma migrate dev
   ```
6. Run the guardrail test:
   ```bash
   pnpm --filter api test tests/schema-constraints.test.ts
   ```
   This test queries `pg_constraint` and `pg_indexes` and **fails loudly** if any expected constraint or partial index is missing.

If `schema-constraints.test.ts` fails, you forgot step 4. Add the missing constraints to the new migration, regenerate, and re-run.

---

## Canonical raw SQL block

This is the reference block. Every migration that rebuilds one of the affected tables must include the relevant lines at the bottom of its `migration.sql`.

```sql
-- ────────────────────────────────────────────────────────────────────────────
-- lifeos v1 raw SQL block (ADR-1 / ADR-3 / ADR-8)
--
-- These constraints and partial indexes cannot be expressed in schema.prisma.
-- They MUST be re-appended to every new migration that touches the affected
-- tables. tests/schema-constraints.test.ts asserts their presence on every
-- test run.
-- ────────────────────────────────────────────────────────────────────────────

-- Task must belong to EXACTLY ONE of Project or Area (true XOR).
-- A task nested under a project inherits its area transitively via project.area_id.
-- A task "standalone under an area" has no project but has an area.
ALTER TABLE "Task" ADD CONSTRAINT task_parent_xor
  CHECK (("project_id" IS NULL) <> ("area_id" IS NULL));

-- Sprint week constraint — end_date must be exactly 6 days after start_date.
ALTER TABLE "Sprint" ADD CONSTRAINT sprint_week_check
  CHECK ("end_date" = "start_date" + INTERVAL '6 days');

-- EntityLink self-reference prevention.
ALTER TABLE "EntityLink" ADD CONSTRAINT entity_link_no_self
  CHECK (NOT ("source_type" = "target_type" AND "source_id" = "target_id"));

-- EntityLink relation_type whitelist (parent_of removed — Project/Task
-- hierarchy uses native parent_id so a separate relation would duplicate it).
ALTER TABLE "EntityLink" ADD CONSTRAINT entity_link_relation_check
  CHECK ("relation_type" IN ('references', 'blocks', 'depends_on'));

-- Archive-filter partial indexes (ADR-3). Default list views filter
-- WHERE archived_at IS NULL; these indexes make that path fast.
CREATE INDEX "idx_Area_active"     ON "Area"     ("user_id") WHERE "archived_at" IS NULL;
CREATE INDEX "idx_Project_active"  ON "Project"  ("user_id") WHERE "archived_at" IS NULL;
CREATE INDEX "idx_Task_active"     ON "Task"     ("user_id") WHERE "archived_at" IS NULL;
CREATE INDEX "idx_Resource_active" ON "Resource" ("user_id") WHERE "archived_at" IS NULL;
```

---

## Add a new entity type (v2 recipe)

Say you want to add a `Goal` entity in v2. These are the touchpoints:

### 1. Schema
- Add `model Goal { ... user_id, archived_at, ... }` to `apps/api/prisma/schema.prisma`
- Add `'goal'` to the `EntityType` enum (if goals should be taggable/linkable)
- Run `prisma migrate dev --name add_goal`
- Append to the new migration: `CREATE INDEX "idx_Goal_active" ON "Goal" ("user_id") WHERE "archived_at" IS NULL;`
- Update the `entity_link_no_self` and related CHECK constraints if `EntityType` changed

### 2. Shared package
- `packages/shared/src/schemas/goal.ts` — `GoalSchema`, `GoalCreateSchema`, `GoalUpdateSchema`
- Export from `packages/shared/src/index.ts`
- If adding to `EntityType`: update `enums.ts` and fix downstream enum references (linter catches them)

### 3. Backend
- `apps/api/src/routes/goals.ts` — full CRUD following the `areas.ts` template
- `apps/api/src/services/entity-links.ts` — add a `case 'goal':` to `assertEntityExists`
- `apps/api/src/services/hydrate.ts` — add a `case 'goal':` to `hydrateEntities`
- `apps/api/src/server.ts` — register the new route module
- `apps/api/tests/routes.goals.test.ts` — integration tests
- Update `tests/schema-parity.test.ts` model list

### 4. Frontend
- `apps/web/src/hooks/use-goals.ts`
- `apps/web/src/pages/goals-page.tsx` + `goal-detail-page.tsx`
- `apps/web/src/components/forms/goal-form.tsx`
- `apps/web/src/components/layout/sidebar.tsx` — add nav item
- `apps/web/src/components/links/entity-badge.tsx` — add `goal` to `TYPE_COLORS` + `TYPE_PLURAL`
- `apps/web/src/components/links/link-picker.tsx` — add to `TYPE_OPTIONS`
- `apps/web/src/pages/tag-detail-page.tsx` — add to `SECTIONS`
- `apps/web/src/App.tsx` — add routes

### 5. Verify
- `pnpm -r typecheck`
- `pnpm -r test`
- Manual: click through create → detail → tag → link flow

---

## Enable real auth (JWT bolt-on recipe)

**Goal:** replace the hardcoded local user with proper JWT authentication.

### 1. Schema
- Add `password_hash TEXT NOT NULL` and `last_login_at TIMESTAMPTZ` to `User`
- Migration + raw SQL block unchanged

### 2. Backend
- Install `@fastify/jwt` + `bcrypt`
- Add `apps/api/src/routes/auth.ts` with `POST /api/auth/login` and `POST /api/auth/register`
- **Replace the body of `apps/api/src/plugins/auth-stub.ts`** — keep the file name and plugin signature:
  ```typescript
  // Was:
  app.addHook('preHandler', async (request) => {
    request.user = { id: LOCAL_USER_ID };
  });

  // Becomes:
  app.addHook('preHandler', async (request, reply) => {
    try {
      await request.jwtVerify();
      // request.user populated by @fastify/jwt from the token payload
    } catch {
      return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'Invalid or missing token' } });
    }
  });
  ```
- Change the Fastify bind in `server.ts` from `127.0.0.1` to `0.0.0.0` (or keep 127.0.0.1 + reverse proxy)
- Add an unauthenticated route whitelist for `/health`, `/api/auth/login`, `/api/auth/register`

### 3. Frontend
- Replace `getAuthToken()` in `apps/web/src/lib/api-client.ts` — read from a Zustand auth store instead of hardcoded `'DEV'`
- Add login/register pages
- Wrap the router in a `<RequireAuth>` boundary
- Add logout action that clears the auth store

### 4. Routes
- No route changes — every existing route already reads `req.user.id`. Nothing in the service layer or route layer needs to change.

### 5. Verify
- `pnpm -r test` — if the tests use `resetDb` with a hardcoded `LOCAL_USER_ID`, update the helper to seed via the auth API or to set up the authenticated test client

---

## Testing architecture

- **Backend:** Vitest running integration tests against a real `lifeos_test` Postgres database (per repo rules — no DB mocks). `tests/setup.ts` swaps `DATABASE_URL` to the test DB before Prisma loads. `tests/helpers/reset.ts` TRUNCATEs all tables CASCADE and re-seeds the local user in `beforeEach`. Tests run serially (`fileParallelism: false`) so TRUNCATE doesn't stomp on parallel writes.
- **Frontend:** Vitest + jsdom + React Testing Library. Each test mocks `global.fetch` with a URL-aware factory to return fresh `Response` instances (body streams are one-shot and shared hooks can consume them). Wraps components in `QueryClientProvider` + `MemoryRouter`.

---

## Dev environment quirks this repo handles

### Linux `fs.inotify.max_user_instances` limit

Default is 128 on many distros. Node's file watcher exhausts this quickly. We work around it with polling:
- `apps/web/vite.config.ts` sets `server.watch.usePolling: true` (opt out with `VITE_NO_POLL=1`)
- `apps/api/package.json` dev script sets `CHOKIDAR_USEPOLLING=1`

### Prisma `@db.Date` rejects raw strings

Prisma's `@db.Date` columns require `Date` objects on write, not ISO strings. Our routes pass user input through `apps/api/src/lib/coerce.ts::toDate()` before calling Prisma — this accepts string | Date | null | empty-string and normalizes.

### `.env` symlink

`apps/api/.env` is a symlink to the repo-root `.env`. Prisma's CLI looks for `.env` relative to `schema.prisma` by default, and we want a single source of truth. The symlink is git-ignored.
