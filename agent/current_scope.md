# Current Scope — lifeos v1 MVP

## In Scope
- PARA entities: Projects (completable, hierarchy), Areas (ongoing), Resources (notes/URLs/clippings)
- Archive-as-soft-delete via nullable `archived_at` timestamp with partial indexes
- Tasks with subtasks, Eisenhower priority (urgency + importance + `priority_score` slot for future weighted model), estimate_minutes, due dates, Kanban status
- Sprints: Sunday-to-Saturday, created on demand, find-or-create resolver
- Kanban board per sprint with dnd-kit drag-and-drop + React Query optimistic updates
- Single `/api/dashboard` aggregator endpoint for homepage
- Polymorphic `entity_links` table for bidirectional references (backlinks panel)
- Polymorphic `entity_tags` table for tags across every entity type
- Sort/filter on all list views via URL search params
- Sprint planning view with capacity (sum of estimate_minutes) + Area balance
- Hand-written Zod schemas in `packages/shared` as single validation source of truth
- Auth-ready but no auth wired in v1 (bind 127.0.0.1, `LOCAL_USER_ID` const, preHandler hook stub)
- Integration tests against real Postgres test DB, TRUNCATE between tests
- RTL smoke tests for dashboard and Kanban
- `docker-compose.yml` for Postgres 16, `pnpm bootstrap` script

## Out of Scope (v2+)
- Memory/reminder engine
- Notion importer
- Rich text editor beyond basic markdown
- Multi-user auth, JWT wiring, deployment tooling beyond local Postgres
- Mobile-specific UI / PWA manifest
- CI pipeline
- Analytics / telemetry
- Recurring tasks
- Smart prioritization beyond Eisenhower
- Per-task notifications
- Time tracking beyond static `estimate_minutes`

## Stack (locked)
- Frontend: React + Vite + TypeScript + Tailwind CSS + React Query + Zustand (UI-local only) + dnd-kit + react-hook-form
- Backend: Node 20 + Fastify + TypeScript + `fastify-type-provider-zod`
- DB: PostgreSQL 16
- ORM: Prisma
- Monorepo: pnpm workspaces (apps/api, apps/web, packages/shared)
- Test: Vitest + React Testing Library
