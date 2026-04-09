# Bounded Task — lifeos v1 MVP (greenfield)

**Date:** 2026-04-08
**Status:** Awaiting user approval (Phase 4 halt)
**Plan source:** 3-peer synthesis — planner + architect + Codex. Zero substantive divergence.

---

## Why This Is Next

User wants to rebuild a Notion-based personal life management system from scratch as a self-hostable web app. Combines Tiago Forte's **PARA** method (Projects, Areas, Resources, archives-as-flag) with **Scrum-style weekly sprints** (Sunday planning ritual, Kanban board, daily dashboard). Core pain point: "I'm constantly forgetting things" — the system must surface what needs attention.

## Domain Terms

- **PARA**: Projects (completable), Areas (ongoing), Resources (reference), Archives (soft-delete via `archived_at` — NOT a separate table)
- **Sprint**: one-week Sunday-through-Saturday container, created on demand (NOT 52-pre-generated)
- **Kanban**: per-sprint board with columns Backlog → To Do → In Progress → Review → Done
- **Eisenhower**: urgency × importance prioritization (0-3 each)
- **Polymorphic link**: any entity type can link to any other via a single `entity_links` table
- **Backlinks panel**: "referenced by" list on every detail view

## Files / Subsystems Involved

Greenfield build at `~/Documents/lifeos/`. Monorepo (pnpm workspaces):

```
lifeos/
├── README.md                        # Setup walkthrough
├── ARCHITECTURE.md                  # ER diagram, polymorphism trade-off, JWT-bolt-on recipe
├── docker-compose.yml               # postgres:16-alpine + named volume
├── .env.example
├── .gitignore
├── .nvmrc                           # Node 20 LTS
├── pnpm-workspace.yaml
├── package.json                     # Root scripts: dev, build, test, lint, typecheck
├── tsconfig.base.json
├── apps/
│   ├── api/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/0_init/migration.sql
│   │   │   └── seed.ts              # Creates LOCAL_USER_ID
│   │   ├── src/
│   │   │   ├── server.ts            # Fastify, binds 127.0.0.1
│   │   │   ├── config.ts            # LOCAL_USER_ID const, TZ
│   │   │   ├── plugins/
│   │   │   │   ├── prisma.ts
│   │   │   │   ├── error-handler.ts
│   │   │   │   └── auth-stub.ts     # Future JWT replaces this one hook
│   │   │   ├── routes/
│   │   │   │   ├── areas.ts
│   │   │   │   ├── projects.ts
│   │   │   │   ├── tasks.ts
│   │   │   │   ├── resources.ts
│   │   │   │   ├── sprints.ts
│   │   │   │   ├── tags.ts
│   │   │   │   ├── entity-links.ts
│   │   │   │   └── dashboard.ts     # Aggregator
│   │   │   ├── services/
│   │   │   │   ├── current-sprint.ts    # find-or-create by today
│   │   │   │   ├── archive.ts
│   │   │   │   ├── entity-links.ts      # assertEntityExists, hydrator
│   │   │   │   └── dashboard.ts
│   │   │   └── lib/
│   │   │       ├── week.ts              # Sunday->Saturday math, TZ-aware
│   │   │       └── prioritize.ts        # Eisenhower → priority_score
│   │   └── tests/
│   │       ├── setup.ts                 # TRUNCATE between tests
│   │       ├── helpers/factories.ts
│   │       ├── routes.*.test.ts         # one per entity
│   │       ├── services.current-sprint.test.ts
│   │       └── integrity.test.ts        # orphan link detector
│   └── web/
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts               # /api proxy → 127.0.0.1:3000
│       ├── tailwind.config.ts
│       ├── postcss.config.cjs
│       ├── index.html
│       └── src/
│           ├── main.tsx                 # QueryClientProvider, Router
│           ├── app.tsx                  # Layout shell
│           ├── lib/{api-client,query-keys}.ts
│           ├── stores/ui-store.ts       # Zustand — UI-only
│           ├── hooks/
│           │   ├── use-{areas,projects,tasks,resources,sprints}.ts
│           │   ├── use-current-sprint.ts
│           │   └── use-dashboard.ts
│           ├── pages/
│           │   ├── dashboard-page.tsx
│           │   ├── {areas,projects,tasks,resources,sprints}-page.tsx
│           │   ├── {area,project,task,resource,sprint}-detail-page.tsx
│           │   ├── sprint-planning-page.tsx
│           │   ├── tags-page.tsx                    # list all tags
│           │   └── tag-detail-page.tsx              # lists all entities with this tag (by type section)
│           ├── components/
│           │   ├── layout/{sidebar,topbar,page-shell}.tsx
│           │   ├── kanban/{board,column,sortable-card,card}.tsx
│           │   ├── forms/{area,project,task,resource,sprint}-form.tsx
│           │   ├── tags/{tag-picker,tag-chip}.tsx
│           │   ├── links/{link-picker,backlinks-panel}.tsx
│           │   ├── filters/{sort-bar,filter-bar}.tsx
│           │   └── dashboard/{widget,due-today,stale-warnings,area-focus,recent-resources,current-sprint-summary}.tsx
│           └── tests/
│               ├── dashboard-page.test.tsx
│               └── kanban-board.test.tsx
└── packages/
    └── shared/
        ├── package.json
        ├── tsconfig.json
        └── src/
            ├── index.ts
            ├── enums.ts                 # TaskStatus, SprintStatus, EntityType, RelationType
            ├── sprint.ts                # startOfSprint/endOfSprint pure fns
            └── schemas/
                ├── area.ts
                ├── project.ts
                ├── task.ts
                ├── resource.ts
                ├── sprint.ts
                ├── tag.ts
                ├── entity-link.ts
                └── dashboard.ts
```

## Architectural Decisions (locked by synthesis)

### ADR-1: Polymorphic `entity_links` table (single polymorphic)
- **Scope:** `EntityType` enum = `area | project | task | resource` — **Sprint is explicitly excluded** from polymorphism in v1. Sprints are ephemeral weekly containers, not "forever" objects you reference; tagging or linking a specific past sprint is a v2 feature. Excluding sprint now avoids dead UI paths and keeps `EntityType` tight.
- **`relation_type` whitelist:** `references | blocks | depends_on` only. **`parent_of` is removed** — Projects and Tasks already have native `parent_id` self-refs, so a `parent_of` relation would duplicate the hierarchy in two places.
- Columns: `id, user_id, source_type EntityType, source_id UUID, target_type EntityType, target_id UUID, relation_type TEXT, created_at`
- `@@unique([source_type, source_id, target_type, target_id, relation_type])`
- Indexes: `(source_type, source_id)` for outgoing, `(target_type, target_id)` for backlinks
- CHECK constraints (raw SQL appended to init migration): self-link prevention, `relation_type IN ('references','blocks','depends_on')`
- Trade-off: loses DB-level FKs; mitigated by `assertEntityExists(type, id)` on every link create (in the links service) and `tests/integrity.test.ts` that asserts zero orphans. Since v1 exposes NO hard-delete path (soft delete only — see ADR-3), orphans can only appear via manual SQL tampering, which the integrity test catches as a regression.
- **Why not per-pair junction tables**: C(5,2)+5 = 15 tables, N² growth, backlink panel becomes a 5-way UNION — contradicts "any entity can link to any other"
- **Why not graph DB**: overkill for single-user, violates stack lock, dual-write divergence risk

### ADR-2: Polymorphic `entity_tags` table
- Same `EntityType` scope as ADR-1: `area | project | task | resource` — **Sprint is NOT taggable in v1**. Same rationale: sprints are ephemeral.
- Same pattern as ADR-1: `(tag_id, entity_type, entity_id)` composite unique
- Indexes: `(entity_type, entity_id)` for "tags on this entity", `(tag_id)` for "entities with tag X"

### ADR-3: Archive via `archived_at TIMESTAMPTZ NULL`
- Partial indexes: `CREATE INDEX idx_{table}_active ON {table}(user_id) WHERE archived_at IS NULL` on Area, Project, Task, Resource
- Filter enforcement at **route layer** via `applyArchivedFilter(where, query)` helper — NOT Prisma middleware (no hidden magic)
- `?includeArchived=true` query param to opt out
- **Entity lifecycle contract (v1):** There is NO hard-delete path exposed in the API. `DELETE /api/{entity}/:id` sets `archived_at` (soft delete). Therefore:
  - `entity_links` and `entity_tags` rows are NEVER removed by archive operations. They persist through archive.
  - The backlinks hydrator in `services/entity-links.ts` filters out archived entities by default (`WHERE archived_at IS NULL` in the hydrated entity lookup). A `?includeArchived=true` query param on the backlinks endpoint reveals them.
  - The tag query endpoint (`GET /api/tags/:id/entities`) has the same behavior.
  - `tests/integrity.test.ts` does NOT test hard-delete cleanup (there is none). Instead it asserts: (a) every `entity_links.source_id` exists in a table matching `source_type`, (b) every `entity_links.target_id` exists in a table matching `target_type`, (c) every `entity_tags.entity_id` exists in a table matching `entity_type`. Orphans can only appear if a dev manually deletes via SQL — the test catches that regression.
  - Rationale: the "second brain" value of bidirectional references is historical. Archiving a task should NOT amnesia its references — you might unarchive later. Hard delete is reserved for v2 if ever needed.

### ADR-4: Single `/api/dashboard` aggregator endpoint
- Parallel `Promise.all` of ~5 Prisma queries in one handler
- Single React Query key `['dashboard']`, `staleTime: 30s`
- All widget-affecting mutations call a shared `invalidateDashboard()` helper
- **Why not parallel per-widget calls**: 5 round-trips, 5 loading states, UI composition leaks to client

### ADR-5: dnd-kit for Kanban + gapped-integer `sort_order`
- `@dnd-kit/core` + `@dnd-kit/sortable`, keyboard + pointer sensors (accessibility from day 1)
- `sort_order INT NOT NULL` stepped by 1000; rebalance helper when gap < 2
- Composite index `(sprint_id, status, sort_order)` for Kanban column read
- Optimistic update via React Query `onMutate`/`onError`/`onSettled` rollback
- Zustand holds only UI-local drag state (hover target)
- **Why not LexoRank**: premature for single-user; integers are simpler

### ADR-6: pnpm workspaces with `packages/shared` for Zod
- Prisma schema lives in `apps/api/prisma/`, client generated there only (frontend never imports Prisma runtime)
- `packages/shared/src/schemas/*.ts` hand-written Zod schemas — single source of truth for API validation (`fastify-type-provider-zod`) AND frontend form validation (`react-hook-form` + `@hookform/resolvers/zod`)
- **`tests/schema-parity.test.ts` precise spec:** for each Prisma model in scope (Area, Project, Task, Resource, Sprint, Tag), the test asserts: (a) every non-system column (excluding `id`, `created_at`, `updated_at`, `user_id`) is present as a field on the corresponding `XxxCreateSchema` and `XxxSchema` (response) in `packages/shared/src/schemas/xxx.ts`; (b) nullable Prisma fields are `.optional()` or `.nullable()` on the Zod side; (c) Prisma enums match Zod `z.enum([...])` value lists by set equality. This is not "shape equivalence" — request bodies legitimately omit `id`/timestamps — it's "no Prisma column is silently missing from the API contract."
- **Why not `prisma-zod-generator`**: adds codegen step for 7 models; hand-written is clearer and expresses validation rules (min/max, regex) beyond schema derivation

### ADR-7: Auth-ready, no auth in v1
- Every user-owned table has `user_id UUID NOT NULL` from migration 001
- `apps/api/src/config.ts` exports `LOCAL_USER_ID` constant; seed inserts that row
- `apps/api/src/plugins/auth-stub.ts` adds a single `preHandler` hook: `req.user = { id: LOCAL_USER_ID }`
- V2 JWT: replace the hook body — every route already reads `req.user.id`
- Fastify binds `host: '127.0.0.1'` explicitly; README documents that exposing it requires enabling auth

### ADR-8: Sprint dates as DATE, TZ-aware
- `Sprint.start_date DATE` and `end_date DATE` (NOT `TIMESTAMPTZ`) — sidesteps DST entirely
- `User.timezone TEXT NOT NULL DEFAULT 'America/Boise'` (user is in Idaho; seed reflects this)
- **Browser auto-detect:** in `apps/web/src/main.tsx`, on first load, call `Intl.DateTimeFormat().resolvedOptions().timeZone`; if the returned IANA zone differs from the user's stored `timezone`, `PATCH /api/users/me { timezone }` once per session. Lets the system self-correct if the user works from a different timezone.
- CHECK constraint: `end_date = start_date + INTERVAL '6 days'`
- `UNIQUE(user_id, start_date)` prevents double-create races
- `GET /api/sprints/current` → find-or-create by `start_date = startOfSprint(today in user TZ)`
- Pure helpers in `packages/shared/src/sprint.ts`: `startOfSprint(today)`, `endOfSprint(today)`
- Add `PATCH /api/users/me` as the only user-mutation route in v1 (edit `name`, `timezone`) — tiny surface, supports the browser auto-detect above

### ADR-9: TRUNCATE between tests
- Separate database `lifeos_test` on the docker-compose Postgres
- `beforeEach`: `TRUNCATE TABLE ... CASCADE; RESTART IDENTITY`, then seed `LOCAL_USER_ID`
- **Why not transaction rollback**: requires Fastify plumbing (AsyncLocalStorage + decorator injection) for ~7 entities that don't justify it
- Frontend: RTL smoke tests only (dashboard, Kanban column render). Playwright deferred to v2

### ADR-10: Local-only deploy, self-host deferred
- `docker-compose.yml` runs only Postgres
- `pnpm bootstrap` script: `docker compose up -d postgres` → wait → `prisma migrate deploy` → seed
- TLS, reverse proxy, mobile-reachable hosting deferred to v2; documented as a README section

## Prisma Schema Sketch (full)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum TaskStatus      { backlog; todo; in_progress; review; done }
enum SprintStatus    { planned; active; complete }
enum ProjectStatus   { not_started; active; blocked; complete }
// Sprint is intentionally excluded — sprints are ephemeral weekly containers,
// not objects you reference or tag forever. v2 may revisit.
enum EntityType      { area; project; task; resource }
enum ResourceKind    { note; url; clipping }

model User {
  id         String   @id @default(uuid()) @db.Uuid
  email      String   @unique
  name       String
  timezone   String   @default("America/Boise")
  created_at DateTime @default(now()) @db.Timestamptz(6)

  areas     Area[]
  projects  Project[]
  tasks     Task[]
  resources Resource[]
  sprints   Sprint[]
  tags      Tag[]
}

model Area {
  id          String    @id @default(uuid()) @db.Uuid
  user_id     String    @db.Uuid
  name        String
  description String?
  color       String?
  archived_at DateTime? @db.Timestamptz(6)
  created_at  DateTime  @default(now()) @db.Timestamptz(6)
  updated_at  DateTime  @updatedAt @db.Timestamptz(6)

  user     User      @relation(fields: [user_id], references: [id], onDelete: Cascade)
  projects Project[]
  tasks    Task[]
  resources Resource[]

  @@index([user_id])
}

model Project {
  id             String        @id @default(uuid()) @db.Uuid
  user_id        String        @db.Uuid
  area_id        String?       @db.Uuid
  parent_id      String?       @db.Uuid
  name           String
  description    String?
  status         ProjectStatus @default(not_started)
  target_date    DateTime?     @db.Date
  priority_score Float         @default(0)
  archived_at    DateTime?     @db.Timestamptz(6)
  completed_at   DateTime?     @db.Timestamptz(6)
  created_at     DateTime      @default(now()) @db.Timestamptz(6)
  updated_at     DateTime      @updatedAt @db.Timestamptz(6)

  user     User      @relation(fields: [user_id], references: [id], onDelete: Cascade)
  area     Area?     @relation(fields: [area_id], references: [id], onDelete: SetNull)
  parent   Project?  @relation("ProjectHierarchy", fields: [parent_id], references: [id], onDelete: SetNull)
  children Project[] @relation("ProjectHierarchy")
  tasks    Task[]

  @@index([user_id])
  @@index([area_id])
  @@index([parent_id])
  @@index([status])
}

model Task {
  id               String     @id @default(uuid()) @db.Uuid
  user_id          String     @db.Uuid
  project_id       String?    @db.Uuid
  area_id          String?    @db.Uuid
  parent_id        String?    @db.Uuid
  sprint_id        String?    @db.Uuid
  title            String
  description      String?
  status           TaskStatus @default(backlog)
  urgency          Int        @default(0)  // 0..3
  importance       Int        @default(0)  // 0..3
  estimate_minutes Int?
  due_date         DateTime?  @db.Date
  priority_score   Float      @default(0)  // future weighted model slot
  sort_order       Int        @default(1000)
  archived_at      DateTime?  @db.Timestamptz(6)
  completed_at     DateTime?  @db.Timestamptz(6)
  created_at       DateTime   @default(now()) @db.Timestamptz(6)
  updated_at       DateTime   @updatedAt @db.Timestamptz(6)

  user     User     @relation(fields: [user_id], references: [id], onDelete: Cascade)
  project  Project? @relation(fields: [project_id], references: [id], onDelete: SetNull)
  area     Area?    @relation(fields: [area_id], references: [id], onDelete: SetNull)
  parent   Task?    @relation("TaskHierarchy", fields: [parent_id], references: [id], onDelete: SetNull)
  children Task[]   @relation("TaskHierarchy")
  sprint   Sprint?  @relation(fields: [sprint_id], references: [id], onDelete: SetNull)

  @@index([user_id])
  @@index([project_id])
  @@index([area_id])
  @@index([parent_id])
  @@index([sprint_id])
  @@index([sprint_id, status, sort_order])  // Kanban column read path
  @@index([due_date])
  @@index([status])
}

model Resource {
  id          String       @id @default(uuid()) @db.Uuid
  user_id     String       @db.Uuid
  area_id     String?      @db.Uuid
  title       String
  url         String?
  body_md     String?
  source_kind ResourceKind @default(note)
  archived_at DateTime?    @db.Timestamptz(6)
  created_at  DateTime     @default(now()) @db.Timestamptz(6)
  updated_at  DateTime     @updatedAt @db.Timestamptz(6)

  user User  @relation(fields: [user_id], references: [id], onDelete: Cascade)
  area Area? @relation(fields: [area_id], references: [id], onDelete: SetNull)

  @@index([user_id])
  @@index([area_id])
}

model Sprint {
  id         String       @id @default(uuid()) @db.Uuid
  user_id    String       @db.Uuid
  start_date DateTime     @db.Date
  end_date   DateTime     @db.Date
  status     SprintStatus @default(planned)
  goal       String?
  created_at DateTime     @default(now()) @db.Timestamptz(6)
  updated_at DateTime     @updatedAt @db.Timestamptz(6)

  user  User   @relation(fields: [user_id], references: [id], onDelete: Cascade)
  tasks Task[]

  @@unique([user_id, start_date])
  @@index([user_id, status])
  @@index([start_date])
}

model Tag {
  id         String   @id @default(uuid()) @db.Uuid
  user_id    String   @db.Uuid
  name       String
  color      String?
  created_at DateTime @default(now()) @db.Timestamptz(6)

  user        User        @relation(fields: [user_id], references: [id], onDelete: Cascade)
  entity_tags EntityTag[]

  @@unique([user_id, name])
  @@index([user_id])
}

model EntityTag {
  id          String     @id @default(uuid()) @db.Uuid
  tag_id      String     @db.Uuid
  entity_type EntityType
  entity_id   String     @db.Uuid
  created_at  DateTime   @default(now()) @db.Timestamptz(6)

  tag Tag @relation(fields: [tag_id], references: [id], onDelete: Cascade)

  @@unique([tag_id, entity_type, entity_id])
  @@index([entity_type, entity_id])
  @@index([tag_id])
}

model EntityLink {
  id            String     @id @default(uuid()) @db.Uuid
  user_id       String     @db.Uuid
  source_type   EntityType
  source_id     String     @db.Uuid
  target_type   EntityType
  target_id     String     @db.Uuid
  relation_type String     @default("references")
  created_at    DateTime   @default(now()) @db.Timestamptz(6)

  @@unique([source_type, source_id, target_type, target_id, relation_type])
  @@index([source_type, source_id])
  @@index([target_type, target_id])
  @@index([user_id])
}
```

**Raw SQL appended to `0_init/migration.sql`:**

```sql
-- Task must belong to EXACTLY ONE of Project or Area (true XOR)
-- A task nested under a project inherits its area transitively via project.area_id
-- A task "standalone under an area" has no project but has an area
ALTER TABLE "Task" ADD CONSTRAINT task_parent_xor
  CHECK ((project_id IS NULL) <> (area_id IS NULL));

-- Sprint week constraint
ALTER TABLE "Sprint" ADD CONSTRAINT sprint_week_check
  CHECK (end_date = start_date + INTERVAL '6 days');

-- Prevent self-links
ALTER TABLE "EntityLink" ADD CONSTRAINT entity_link_no_self
  CHECK (NOT (source_type = target_type AND source_id = target_id));

-- Relation-type whitelist (parent_of removed — Project/Task hierarchy uses native parent_id)
ALTER TABLE "EntityLink" ADD CONSTRAINT entity_link_relation_check
  CHECK (relation_type IN ('references','blocks','depends_on'));

-- Partial indexes for default archive filter
CREATE INDEX idx_area_active     ON "Area"     (user_id) WHERE archived_at IS NULL;
CREATE INDEX idx_project_active  ON "Project"  (user_id) WHERE archived_at IS NULL;
CREATE INDEX idx_task_active     ON "Task"     (user_id) WHERE archived_at IS NULL;
CREATE INDEX idx_resource_active ON "Resource" (user_id) WHERE archived_at IS NULL;
```

## Phase Breakdown

### P0 — Scaffolding
**Files:** `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.gitignore`, `.nvmrc`, `.env.example`, `docker-compose.yml`, `apps/api/**`, `apps/web/**`, `packages/shared/**`, `README.md`

**Key decisions:** pnpm workspaces (strict isolation surfaces missing peers), Node 20 LTS pinned, API binds `127.0.0.1` only, `packages/shared` workspace type resolution verified in dev mode before P1

**Acceptance criteria:**
- `pnpm install` completes with zero errors
- `docker compose up -d postgres` → `pg_isready` returns 0
- `pnpm --filter api dev` → `curl 127.0.0.1:3000/health` returns `{"status":"ok"}`
- `pnpm --filter web dev` → browser loads Hello World
- A P0 placeholder export `export const HEALTH_CHECK_NAME = 'lifeos'` in `packages/shared/src/index.ts` is importable from `apps/web/src/main.tsx` as `import { HEALTH_CHECK_NAME } from '@lifeos/shared'` and type-checks in Vite dev mode with **no build step**. (The Zod schema imports land in P2 and must continue to resolve the same way — the P0 test proves the workspace plumbing works before any real code depends on it.)

**Risks:** pnpm not installed on host (mitigation: `corepack enable` in README step 1), port 5432 taken (mitigation: `POSTGRES_PORT` env override), workspace type resolution broken (mitigation: verify before P1)

**User-visible output:** No (infra only)

---

### P1 — Schema + Migrations
**Files:** `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/0_init/migration.sql`, `apps/api/prisma/seed.ts`, `apps/api/src/config.ts`, `.env.example`

**Key decisions:** UUID PKs client-generated, `Timestamptz(6)` for all timestamps, `onDelete: SetNull` on hierarchy parents, raw SQL section clearly commented

**Acceptance criteria:**
- `pnpm --filter api prisma migrate dev --name init` applies cleanly
- `pnpm --filter api prisma db seed` inserts exactly one User row (psql count=1)
- `\d+ "Task"` shows `task_parent_xor` CHECK with body `(project_id IS NULL) <> (area_id IS NULL)` (true XOR)
- `\d+ "EntityLink"` shows `entity_link_no_self` and `entity_link_relation_check` CHECKs
- `tests/schema-constraints.test.ts` queries `pg_constraint` and `pg_indexes` and asserts: all 4 CHECK constraints exist, all 4 partial indexes exist, partial index predicates contain `archived_at IS NULL`. This is the guardrail against raw SQL drift across future migrations.

**Risks:** raw SQL drift on new migrations (mitigation: `schema-constraints.test.ts` catches regressions immediately; ARCHITECTURE.md "schema evolution" recipe), Postgres 16 version mismatch (mitigation: pinned in docker-compose)

**User-visible output:** No

---

### P2 — Backend CRUD + API
**Files:** `apps/api/src/server.ts`, `apps/api/src/plugins/{prisma,error-handler,auth-stub}.ts`, `apps/api/src/routes/{users,areas,projects,tasks,resources,sprints,tags,entity-links}.ts`, `apps/api/src/services/{current-sprint,archive,entity-links}.ts`, `apps/api/src/lib/{week,prioritize}.ts`, `packages/shared/src/schemas/*.ts` (including `user.ts` for UserSchema + UserUpdateSchema), `apps/api/tests/**`

**User route (ADR-8 completeness):** `GET /api/users/me` returns the current user row; `PATCH /api/users/me` accepts `{ name?, timezone? }` with Zod-validated IANA timezone and returns the updated row. This is the backend contract the frontend's browser-timezone auto-detect depends on. It is the only mutation surface on the User table in v1.

**Key decisions:** `fastify-type-provider-zod` for route validation, `prisma.$transaction([...])` for multi-table writes, soft delete only (no real DELETE exposed), `applyArchivedFilter` helper reused in every list route, one Fastify plugin per entity

**Acceptance criteria:**
- `pnpm --filter api test` all integration tests green against real Postgres test DB
- Each route returns correct HTTP codes per `rules/code/api-design.md` (200/201/204/400/404/422)
- `POST /api/areas {name:"Health"}` → 201 + created area
- `GET /api/areas` returns only non-archived by default; `?includeArchived=true` reveals all
- `POST /api/entity-links` with fake `source_id` → 404 (proves existence check)
- Task XOR: POST with both `project_id` AND `area_id` null → 422; with both set → 422

**Risks:** test DB pollution on crashed test (mitigation: TRUNCATE in beforeEach), Zod↔Prisma drift (mitigation: `schema-parity.test.ts`), entity-link service turns into N+1 hot spot (mitigation: batch hydrator assertion test)

**User-visible output:** No (API only; verifiable via curl + tests)

---

### P3 — Frontend Shell + Routing
**Files:** `apps/web/src/main.tsx`, `apps/web/src/app.tsx`, `apps/web/src/lib/{api-client,query-keys}.ts`, `apps/web/src/api/mutations.ts` (centralized mutation helpers including `invalidateDashboard()`), `apps/web/src/stores/ui-store.ts`, `apps/web/tailwind.config.ts`, `apps/web/src/styles.css`, placeholder pages

**Key decisions:** React Router v6 nested under layout shell, React Query = only server-state cache, Zustand = only UI-local (`sidebarOpen`, `activeModal`), `Authorization: Bearer DEV` placeholder header. **Mutation ownership:** `apps/web/src/api/mutations.ts` is introduced in P3 (before any real mutations exist) and exports `invalidateDashboard(queryClient)` as the canonical helper. Every mutation hook added in P4-P7 imports this helper. ARCHITECTURE.md documents the rule: "any new mutation that touches Task/Sprint/Resource must call `invalidateDashboard`."

**Acceptance criteria:**
- `pnpm --filter web dev` starts Vite; shell shows sidebar with Dashboard / Areas / Projects / Tasks / Resources / Sprints
- Nav clicks don't trigger full page reload
- `/api/health` accessible via Vite proxy

**Risks:** Tailwind content glob wrong (mitigation: explicit `./index.html` + `./src/**/*.{ts,tsx}`), React Query/Router provider ordering bug (mitigation: canonical TanStack docs example)

**User-visible output:** **Yes** — first shell visible

---

### P4 — PARA Views (Areas, Projects, Resources, Tasks)
**Files:** `apps/web/src/hooks/use-{areas,projects,tasks,resources}.ts`, `apps/web/src/pages/{areas,projects,tasks,resources}-page.tsx`, `apps/web/src/pages/{area,project,task,resource}-detail-page.tsx`, `apps/web/src/components/forms/**`, `apps/web/src/components/filters/{sort-bar,filter-bar}.tsx`, `apps/web/tests/areas-page.test.tsx`

**Key decisions:** `react-hook-form` + `@hookform/resolvers/zod` consuming shared schemas, sort/filter state in URL search params (shareable, refresh-stable), project hierarchy as expandable tree

**Acceptance criteria:**
- Create → list → detail → edit → archive works end-to-end for all 4 entities against real backend
- Archived items hidden by default; "Show archived" toggle reveals them
- Sort by `created_at`/`name`/`due_date` and filter by area/status via URL params
- Form validation errors display inline matching server messages

**Risks:** `packages/shared` dev-mode type resolution (verified in P0), controlled-vs-uncontrolled input bugs (mitigation: react-hook-form standardization)

**User-visible output:** **Yes** — first real feature. Can create "Health" area, "Run a 5k" project, tasks.

---

### P5 — Sprint + Kanban
**Files:** `apps/api/src/routes/sprints.ts` (extend with `/current`, `/:id/tasks`), `apps/api/src/routes/tasks.ts` (PATCH accepts `{status, sort_order, sprint_id}` with in-transaction reorder), `apps/web/src/pages/{sprints-page,sprint-detail-page,sprint-planning-page}.tsx`, `apps/web/src/components/kanban/**`, `apps/web/src/hooks/{use-sprints,use-current-sprint}.ts`, `apps/web/tests/kanban-board.test.tsx`

**Key decisions:** dnd-kit `PointerSensor` + `KeyboardSensor`, optimistic update via React Query `onMutate`/`onError`/`onSettled`, server is source of truth for canonical ordering, sprint planning footer shows capacity (`sum(estimate_minutes)`) + Area balance (count by area)

**Acceptance criteria:**
- `/sprints` empty state shows "Start this week's sprint"; click creates Sun-Sat sprint
- Drag task across columns moves instantly (optimistic) + persists across reload
- Reorder within column persists `sort_order`
- Planning view capacity sum updates live as tasks assigned
- Keyboard-only drag works (a11y smoke test)

**Risks:** optimistic rollback flicker (mitigation: small debounced invalidation), concurrent drag races (mitigation: server canonical reply), sort_order gap exhaustion (mitigation: rebalance helper when gap < 2)

**User-visible output:** **Yes** — most demo-able phase. User runs first weekly sprint.

---

### P6 — Dashboard
**Files:** `apps/api/src/services/dashboard.ts`, `apps/api/src/routes/dashboard.ts`, `packages/shared/src/schemas/dashboard.ts`, `apps/web/src/hooks/use-dashboard.ts`, `apps/web/src/pages/dashboard-page.tsx`, `apps/web/src/components/dashboard/**`, `apps/web/tests/dashboard-page.test.tsx`

**Key decisions:** single aggregator returning `{currentSprint, inProgressTasks, dueToday, staleTasks, weeklyFocusByArea, recentResources}`, 30s `staleTime`, refetch on window focus, all mutations call `invalidateDashboard()` helper, stale = `updated_at < now() - INTERVAL '14 days' AND status != done AND archived_at IS NULL`

**Acceptance criteria:**
- `GET /api/dashboard` → one document conforming to `DashboardSchema` with all 6 sections (empty arrays when empty, never null)
- Dashboard page mounts with **exactly one** `/api/dashboard` network request (DevTools verified)
- Integration test: seed 1 of each entity type, assert each widget shows expected count

**Risks:** query slowness as data grows (mitigation: P1 indexes; add `EXPLAIN ANALYZE` check at >1k rows), TZ bugs in "due today" / "this week" (mitigation: all date math through `lib/week.ts` with explicit TZ)

**User-visible output:** **Yes** — homepage becomes meaningful

---

### P7 — Tags + References
**Files:** `apps/api/src/routes/tags.ts`, `apps/api/src/routes/entity-links.ts` (extend with backlinks query), `apps/api/src/services/entity-links.ts` (add `getBacklinks`, `getOutgoingLinks` with batched hydration, default `archived_at IS NULL` filter on hydrated entities), `apps/web/src/pages/{tags-page,tag-detail-page}.tsx`, `apps/web/src/components/tags/{tag-picker,tag-chip}.tsx`, `apps/web/src/components/links/{link-picker,backlinks-panel}.tsx`, wire into all `*-detail-page.tsx`

**Key decisions:**
- Backlinks = one round-trip per detail mount, hydration batched server-side by type (one findMany per referenced type)
- `relation_type` whitelist enforced by CHECK constraint from P1
- **Archive semantics (from ADR-3):** backlinks hydrator and tag query hydrator both filter `archived_at IS NULL` by default; `?includeArchived=true` reveals archived targets
- `tag-detail-page.tsx` groups entities by type (Areas / Projects / Tasks / Resources — NOT Sprints, per ADR-2) with per-type counts — satisfies demo step 15 "click tag chip to see all linked entities"
- Tag chip click handler routes to `/tags/:id` (the tag detail page)

**Acceptance criteria:**
- Create tag → attach to 3 entity types → `/tags/:id` page renders all 3 grouped by type
- Link Task A → Resource B; Resource B detail shows "Referenced by: Task A"; Task A shows "Links to: Resource B"
- Archive Task A → Resource B's backlinks panel no longer shows Task A (archive filter in hydrator)
- Toggle "Show archived" on Resource B backlinks → Task A reappears with archived styling
- `tests/integrity.test.ts` passes: every polymorphic FK (`entity_links.source_id`, `entity_links.target_id`, `entity_tags.entity_id`) resolves to a row in its corresponding table per `entity_type`. There is no hard-delete path exposed so this can only fail on manual SQL tampering, but the test catches that regression.

**Risks:** backlinks become slowest part of detail load (mitigation: P1 indexes + React Query cache), orphan rows only possible via manual SQL (mitigation: integrity test), hydrator archive-filter forgotten on a new consumer (mitigation: filter lives in the shared `resolveEntities(refs, {includeArchived})` helper — only one place to change)

**User-visible output:** **Yes** — "second brain" activates

---

### P8 — Polish
**Files:** `README.md`, `ARCHITECTURE.md`, fill test coverage gaps, root `package.json` convenience scripts (`pnpm dev` concurrently runs api+web, `pnpm test`, `pnpm typecheck`), empty-state UI for every list, loading skeletons on dashboard, error boundary at layout shell

**Key decisions:** no CI in v1 (single-user local-only doesn't justify maintenance), ARCHITECTURE.md is sole architectural doc. Required sections:
  - ER diagram (text)
  - Polymorphism trade-off and why (ADR-1 + ADR-2 scope — area/project/task/resource only)
  - Entity lifecycle contract (archive-only, no hard-delete in v1)
  - **Schema evolution discipline** (raw SQL handling): when editing `schema.prisma` and running `prisma migrate dev --name <foo>`, the developer must re-append any needed CHECK constraints and partial indexes to the **new** migration file (Prisma does not carry them forward). The `schema-constraints.test.ts` will fail loudly if anything is missing. Include a checklist: (1) edit schema.prisma, (2) `prisma migrate dev`, (3) open the new `migration.sql`, (4) append raw SQL from ARCHITECTURE.md's canonical block, (5) `pnpm test` to verify.
  - "Add new entity type" recipe (touchpoints checklist)
  - "Enable JWT" recipe (replace `auth-stub.ts`)

**Acceptance criteria:**
- Fresh clone → README setup steps → working app at `http://127.0.0.1:5173` in under 10 minutes
- `pnpm test` runs api+web tests, exit 0
- `pnpm typecheck` exit 0 across workspaces
- `ARCHITECTURE.md` contains: ER diagram, polymorphism trade-off, add-entity recipe, JWT recipe
- Every list view has empty-state UI

**Risks:** polish sprawls into feature creep (mitigation: hard cap on this phase, anything beyond criteria is v1.1), doc drift (mitigation: single source of truth)

**User-visible output:** **Yes** — MVP demoable

---

## Top 5 Architectural Risks + Mitigations

1. **Polymorphic hydrator becomes an N+1 hot spot** — `assertEntityExists` in `entity-links.ts` and dashboard hydration. Mitigation: `resolveLinks()` batches by `target_type`, issues at most one query per type. Vitest asserts ≤N queries for N distinct types regardless of input cardinality. Audit at end of P7.

2. **Raw SQL migration drift from Prisma-generated migrations** — the CHECK constraints + partial indexes live outside the Prisma model. Mitigation: (a) raw SQL appended to the same `0_init/migration.sql` file Prisma generates, so it travels with the migration through `prisma migrate reset` and `prisma migrate deploy`; (b) a P1 smoke test asserts each CHECK constraint exists in `pg_constraint` and each partial index exists in `pg_indexes` — if a future `prisma migrate dev --name <foo>` clobbers them, the test fails immediately; (c) ARCHITECTURE.md has a "schema evolution" section with a recipe for editing Prisma schema + re-appending raw SQL to new migrations; (d) one-line ADR link comment at the top of each raw SQL block so greps find it.

3. **Dashboard cache invalidation forgotten on new mutations** — any new mutation that touches Task/Sprint/Resource must call `invalidateDashboard()`. Mitigation: centralize all mutations in `apps/web/src/api/mutations.ts` with a shared helper; P8 adds a checklist item to `ARCHITECTURE.md`.

4. **Sprint timezone bug at DST boundaries** — 2026-03-08 (DST start) and 2026-11-01 (DST end) are the canonical edge cases. Mitigation: use `DATE` type (not `TIMESTAMPTZ`) for sprint boundaries, centralize all "today in user TZ" logic in `packages/shared/src/sprint.ts`, add unit tests that pin a fake clock at both DST boundaries and assert sprint boundaries don't shift.

5. **`packages/shared` workspace type resolution breaks in Vite dev mode** — if `apps/web` can't see updated types from `packages/shared` without a build step, productivity craters. Mitigation: in P0, verify `import { HEALTH_CHECK_NAME } from '@lifeos/shared'` type-checks in `apps/web/src/main.tsx` and produces the correct value at runtime, before P1 starts. Same import pattern is reused in P2 when real Zod schemas land — if the workspace plumbing works for the P0 placeholder export, it works for schemas too. Use `tsconfig` paths + pnpm workspace `"exports"` field.

## Acceptance Criteria (v1 Done)

The user can walk through this demo script on a fresh machine without consulting docs:

1. `git clone <repo> && cd lifeos && corepack enable && pnpm install`
2. `cp .env.example .env && docker compose up -d postgres`
3. `pnpm --filter api prisma migrate dev && pnpm --filter api prisma db seed`
4. `pnpm dev` → opens `http://127.0.0.1:5173`
5. Dashboard loads with empty state
6. Sidebar → Areas → "New Area" → create "Health" with green color → save
7. Sidebar → Projects → "New Project" → name "Run a 5k", area "Health", target 30 days out → save
8. Open project → "New Task" → "Buy running shoes", urgency 2, importance 3, estimate 30min → save. Add 4 more.
9. Sidebar → Sprints → "Start this week's sprint" → opens sprint detail with empty Kanban
10. Sprint Planning view → drag 3 tasks from backlog into sprint → capacity shows "90 min", Area balance shows "Health: 3"
11. Sprint detail → drag "Buy running shoes" Backlog → To Do → In Progress. Reload — still there.
12. Sidebar → Resources → "New Resource" → "Couch to 5k Plan" URL kind → save
13. Open "Buy running shoes" task → Backlinks panel → "Link to" → pick "Couch to 5k Plan" → save
14. Open Couch to 5k Plan → Backlinks panel shows "Referenced by: Buy running shoes" **[bidirectional ref proven]**
15. Add tag "fitness" to Health area, project, and resource. Click tag chip → all 3 listed **[polymorphic tagging proven]**
16. Sidebar → Dashboard → see current sprint summary, "1 task in progress", today's due tasks, "Health: 3 tasks this week", recent resources, no stale warnings
17. Archive "Buy running shoes" → disappears from task list. "Show archived" toggle reveals it strikethrough. Open "Couch to 5k Plan" resource → backlinks panel no longer shows "Buy running shoes" (default archive filter). Toggle "Show archived" on the backlinks panel → it reappears. **[soft delete + archive-aware backlinks proven]**

If all 17 steps work without inspecting DB/console: **v1 is done.**

## Non-Goals

- Memory/reminder engine (may revisit in v2)
- **Notion importer — permanently out of scope** (user confirmed no import needed)
- Rich text editor (basic markdown only via `body_md` textarea)
- Multi-user auth, JWT wiring
- Mobile-specific UI / PWA manifest
- CI pipeline (GitHub Actions)
- Deployment tooling beyond `docker-compose.yml` for Postgres
- Analytics / telemetry
- Time tracking beyond static `estimate_minutes`
- Recurring tasks
- Smart prioritization beyond Eisenhower
- Per-task notifications

## Stop Conditions

- User rejects polymorphic `entity_links` approach → revert to per-pair junction tables, replan P7
- User wants CI in v1 → add P8.5 with GitHub Actions
- User wants multi-user from day 1 → replan ADR-7 and all routes need `userId` threading
- `packages/shared` type resolution can't work in Vite dev mode without a build step → add a `packages/shared` build watch script, slight dev-loop cost

## Rollback Concerns

Greenfield project — rollback is `rm -rf ~/Documents/lifeos`. Between phases, each phase's work is on a feature branch (`p0-scaffolding`, `p1-schema`, etc.), merged to `main` only after its acceptance criteria pass. The only non-trivial rollback is between P1 and P2 — if the schema needs revision after P2 starts, migrations must be reset and re-generated.

## Required Tests (summary)

- **P1:** Migration applies + seed inserts one user (manual SQL check)
- **P2 unit:** `lib/week.ts` Sunday math; `lib/prioritize.ts` Eisenhower formula. **P2 integration:** happy + validation + not-found per route against real Postgres test DB; `current-sprint.ts` find-or-create idempotency; `schema-parity.test.ts`
- **P5 integration:** task sprint assignment, cross-status move, within-column reorder. **P5 RTL smoke:** keyboard drag triggers mutation
- **P6 integration:** dashboard aggregator all 6 sections with correct counts. **P6 RTL smoke:** all widgets render from mocked response
- **P7 integration:** tag attach/detach across 3 entity types (area/project/task — sprint excluded per ADR-1/ADR-2); link create with bad target → 404; archive source → backlinks hydrator filters it out by default; `?includeArchived=true` reveals archived; `tests/integrity.test.ts` zero orphans. **P7 RTL smoke:** backlinks panel renders grouped by type.
- **P8:** DST edge case unit tests; end-to-end manual walkthrough of demo script

## Review Tier

**Tier C** (user decision): Codex review at the end of EVERY phase (P0 through P8). Each phase-end review runs `gpt_plan.py` against the current state and must return `approve` (or `revise` with non-blocking items only) before the next phase starts. This is the heaviest review cadence — the user explicitly opted in.
