# Current Goal — lifeos v1

Build a personal life-management web app at `~/Documents/lifeos/` combining Tiago Forte's PARA method with Scrum-style weekly sprints.

**Phase:** P1 Schema + Migrations — **COMPLETE**, awaiting Codex tier C phase-end review.
**Next:** P2 Backend CRUD + API (Fastify plugins, route modules per entity, Zod schemas in packages/shared, API integration tests against real Postgres test DB).

## P1 completion evidence

- `apps/api/prisma/schema.prisma` — 9 models (User, Area, Project, Task, Resource, Sprint, Tag, EntityTag, EntityLink) + 5 enums (TaskStatus, SprintStatus, ProjectStatus, EntityType with 4 values (no sprint), ResourceKind). `EntityType` explicitly excludes `sprint` per ADR-1.
- `apps/api/prisma/migrations/20260409022616_init/migration.sql` — Prisma-generated, then hand-appended raw SQL block containing:
  - `task_parent_xor` CHECK: `(project_id IS NULL) <> (area_id IS NULL)` (true XOR)
  - `sprint_week_check` CHECK: `end_date = start_date + INTERVAL '6 days'`
  - `entity_link_no_self` CHECK
  - `entity_link_relation_check` CHECK (relation_type ∈ references/blocks/depends_on; `parent_of` intentionally absent)
  - 4 partial indexes `WHERE archived_at IS NULL` on Area, Project, Task, Resource
- Migration applied cleanly with `prisma migrate dev`.
- `apps/api/src/config.ts` — exports `LOCAL_USER_ID = '00000000-0000-0000-0000-000000000001'`, `LOCAL_USER_EMAIL`, `LOCAL_USER_NAME`, `DEFAULT_TIMEZONE = 'America/Boise'`.
- `apps/api/prisma/seed.ts` — idempotent upsert of the local user. Verified: exactly 1 row in `User` table after seed, `timezone = 'America/Boise'`.
- `apps/api/tests/schema-constraints.test.ts` — **12 tests passing**. Asserts:
  - All 4 CHECK constraints exist in `pg_constraint` with expected definitions
  - All 4 partial indexes exist in `pg_indexes` with `archived_at IS NULL` predicate
  - Constraints are ENFORCED against real inserts (neither-nor task → rejected, bad sprint duration → rejected, self-link → rejected, unknown relation_type → rejected)
- Prisma client generated; `pnpm -r typecheck` passes across all 3 workspaces.
- Vitest 2.x pinned (Vitest 4 wants Vite 6+, apps/web uses Vite 5).

## Deviation log (P1)

1. **Prisma 7 → Prisma 6.19.3 downgrade** — Prisma 7 removed inline `datasource.url` in `schema.prisma` and requires `prisma.config.ts` + a separate connection adapter package. Significant complexity increase for no v1 benefit. Downgraded to Prisma 6 which matches the plan's assumptions.
2. **`.env` symlink `apps/api/.env → ../../.env`** — monorepo pattern; Prisma CLI finds env vars via schema-relative `.env` lookup. Avoids duplicating secrets.
3. **Custom Prisma client `output` path removed from schema.prisma** — the custom `output = "../node_modules/.prisma/client"` broke under pnpm because `@prisma/client` resolves its generated client via the pnpm virtual store, not the app-local `node_modules`. Let Prisma use its default location; everything works.
4. **Vitest 2.x (not 4.x)** — peer dep compat with Vite 5 (apps/web).

## Deviations retained from P0

1. Postgres port 5432 → 5433 (`.env` override)
2. File-watcher polling mode (inotify instance limit workaround)
