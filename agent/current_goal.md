# Current Goal — lifeos v1

Build a personal life-management web app at `~/Documents/lifeos/` combining Tiago Forte's PARA method with Scrum-style weekly sprints.

**Phase:** P2 Backend CRUD + API — **COMPLETE**, awaiting Codex tier C phase-end review.
**Next:** P3 Frontend shell + routing (React Router, layout shell, React Query provider, `apps/web/src/api/mutations.ts` with `invalidateDashboard()`, Tailwind, Zustand UI-only store, typed API client).

## P2 completion evidence

### Shared package (`packages/shared`)
- `enums.ts` — TaskStatusSchema, SprintStatusSchema, ProjectStatusSchema, EntityTypeSchema (4 values, no sprint), ResourceKindSchema, RelationTypeSchema
- `schemas/common.ts` — UuidSchema, DateStringSchema, TimestampSchema (union of string|Date, no transform), TimezoneSchema (IANA validator), ColorSchema, EisenhowerScoreSchema, ListQuerySchema
- `schemas/user.ts` — UserSchema, UserUpdateSchema (require at least one of name/timezone)
- `schemas/area.ts` — AreaSchema, AreaCreateSchema, AreaUpdateSchema
- `schemas/project.ts` — ProjectSchema, ProjectCreateSchema, ProjectUpdateSchema
- `schemas/task.ts` — TaskSchema, TaskCreateSchema (with XOR refine), TaskUpdateSchema + `validateTaskParentXor` helper
- `schemas/resource.ts` — ResourceSchema, ResourceCreateSchema, ResourceUpdateSchema
- `schemas/sprint.ts` — SprintSchema, SprintCreateSchema, SprintUpdateSchema + pure week helpers (`startOfSprint`, `endOfSprint`, `todayInTz`)
- `schemas/tag.ts` — TagSchema, TagCreateSchema, TagAttachSchema, EntityTagSchema
- `schemas/entity-link.ts` — EntityLinkSchema, EntityLinkCreateSchema (with self-link refine), EntityRefSchema

### API plugins (`apps/api/src/plugins/`)
- `prisma.ts` — decorates `app.prisma`, `onClose` disconnect hook
- `error-handler.ts` — maps ZodError/FastifyError/Prisma errors to consistent `{error:{code,message,details?}}` shape; routes 422/404/409 correctly
- `auth-stub.ts` — preHandler sets `req.user = { id: LOCAL_USER_ID }` (the 1-line JWT swap surface)

### Services (`apps/api/src/services/`)
- `archive.ts` — `applyArchivedFilter(where, query)` helper used by every list route
- `current-sprint.ts` — `getOrCreateCurrentSprint` with race-safe find-or-create
- `entity-links.ts` — `assertEntityExists(prisma, userId, type, id)` polymorphic existence guard

### Routes (`apps/api/src/routes/`)
- `users.ts` — `GET /api/users/me`, `PATCH /api/users/me` (name + timezone; supports ADR-8 browser auto-detect)
- `areas.ts` — full CRUD + archive, owner-scoped
- `projects.ts` — full CRUD + archive + filter by area/status
- `tasks.ts` — full CRUD + archive + XOR re-check on PATCH + priority_score recompute on urgency/importance change
- `resources.ts` — full CRUD + archive
- `sprints.ts` — full CRUD + `GET /api/sprints/current` find-or-create + server-computed `end_date`
- `tags.ts` — CRUD + `/attach` + `/detach` + hard-delete (cascades entity_tags)
- `entity-links.ts` — `GET` with `direction=outgoing|incoming|both`, `POST` with existence checks, hard-delete
- `dashboard.ts` — stub returning empty shape (full aggregator lands in P6)

### Tests (70/70 passing, 11 files)
- `tests/setup.ts` — dotenv load, swap DATABASE_URL → DATABASE_URL_TEST before any Prisma import
- `tests/helpers/reset.ts` — TRUNCATE all tables CASCADE + re-seed LOCAL_USER
- `tests/helpers/app.ts` — reusable makeTestApp() invoking production buildApp()
- `tests/routes.users.test.ts` — 4 tests (GET me, PATCH with name/tz, invalid tz 422, empty body 422)
- `tests/routes.areas.test.ts` — 7 tests (CRUD, archive filter, includeArchived, 404, validation)
- `tests/routes.projects.test.ts` — 4 tests (create, validation, area_id filter, archive)
- `tests/routes.tasks.test.ts` — 7 tests (project-parent, area-parent, XOR on create, XOR on patch, priority_score recompute, archive)
- `tests/routes.resources.test.ts` — 3 tests (create url, bad url 422, archive)
- `tests/routes.sprints.test.ts` — 5 tests (create, find-or-create idempotent, Sunday math, PATCH status)
- `tests/routes.tags.test.ts` — 4 tests (create, attach+detach polymorphic, 404 on bad target, hard delete cascades)
- `tests/routes.entity-links.test.ts` — 6 tests (create, source 404, target 404, self-link 422, bad relation 422, direction=both)
- `tests/services.current-sprint.test.ts` — 4 tests (create new, idempotent, Sunday math, todayInTz)
- `tests/schema-parity.test.ts` — 14 tests (Prisma ↔ Zod field presence for every model)
- `tests/schema-constraints.test.ts` — 12 tests (from P1, still passing)

### Infrastructure
- Fastify 5 with `fastify-type-provider-zod@4` (validator+serializer compilers)
- `@fastify/sensible` registered for HTTP error helpers
- `dotenv` for test env loading (symlinked `.env` from repo root)
- Vitest 2.x with `setupFiles` swapping DATABASE_URL to the test DB before any Prisma import
- Single-fork test runner so TRUNCATE doesn't stomp on parallel writes
- `lifeos_test` database created and migrated on `127.0.0.1:5433`

### Deviation log (P2)

1. **Zod timestamp schemas do not use `.transform()`** — original plan had transforms to coerce Date → ISO string, but fastify-type-provider-zod uses the schema's OUTPUT type for handler return-type checking, and the transform forced handlers to return strings while Prisma returns Date objects. Simpler fix: `z.union([z.string(), z.date()])` with no transform. JSON.stringify handles Date→ISO at serialization time naturally. Documented in `packages/shared/src/schemas/common.ts`.
2. **`LOCAL_USER_EMAIL` changed `me@local` → `me@lifeos.local`** — `me@local` failed Zod's `.email()` validator (no TLD). Updated config.ts and seed.
3. **`relation_type` cast in entity-links route** — Prisma stores the column as `string` (since the whitelist is enforced via raw SQL CHECK, not a Prisma enum), but Zod response schema uses the literal union. Added a `toEntityLink` mapper that casts the Prisma row to the stricter type.
4. **Task PATCH XOR error throws instead of reply.code(422)** — the route schema only allows the 200 response shape, so returning a different shape via `reply.code(422).send(...)` fails TS. Throwing a validation-shaped Error is cleaner because it goes through the global error handler.
5. **`packages/shared/package.json` gained a direct zod dependency** (auto-added by pnpm).
