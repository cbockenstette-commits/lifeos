# Open Risks — lifeos v1

1. **Polymorphic hydrator N+1 hot spot** — `entity_links` resolver must batch by type. Mitigation: `resolveLinks()` issues ≤1 query per distinct `target_type`; Vitest asserts ≤N queries for N distinct types. Audit at end of P7.

2. **Raw SQL migration drift from Prisma-generated migrations** — CHECK constraints + partial indexes live outside Prisma models. Mitigation: commit raw SQL to `0_init/migration.sql` explicitly, document in ARCHITECTURE.md, never run `prisma migrate reset` without re-applying.

3. **Dashboard cache invalidation forgotten on new mutations** — any Task/Sprint/Resource mutation must call `invalidateDashboard()`. Mitigation: centralize mutations in `apps/web/src/api/mutations.ts` with shared helper; ARCHITECTURE.md checklist.

4. **Sprint timezone bug at DST boundaries** — 2026-03-08 (DST start) and 2026-11-01 (DST end). Mitigation: `DATE` not `TIMESTAMPTZ` for sprint boundaries, centralize TZ logic in `packages/shared/src/sprint.ts`, unit tests pin fake clock at both boundaries.

5. **`packages/shared` workspace type resolution in Vite dev mode** — must work without a build step. Mitigation: verify `import { AreaSchema } from '@lifeos/shared'` type-checks in `apps/web/src/main.tsx` as a P0 acceptance criterion before P1 starts.

6. **Orphan links/tags via manual SQL tampering** — no DB-level FKs on polymorphic columns. v1 exposes NO hard-delete path (archive-only per ADR-3), so orphans cannot appear via the normal API. Mitigation: `assertEntityExists` on every link/tag create (guards the write path); `tests/integrity.test.ts` queries `pg_constraint` metadata plus cross-references every polymorphic FK and asserts zero orphans — catches regression from a dev running ad-hoc `DELETE` in psql or a future hard-delete path being added without updating the archive-only contract.

7. **Optimistic Kanban rollback race on rapid drags** — concurrent mutations stepping on each other. Mitigation: server returns canonical ordering after every mutation, React Query invalidates the sprint key for next-render authority.

8. **Zod↔Prisma schema drift** — hand-written Zod schemas can fall out of sync with Prisma models. Mitigation: `tests/schema-parity.test.ts` asserts every Prisma scalar has a Zod counterpart.
