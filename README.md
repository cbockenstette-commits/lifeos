# lifeos

A personal life management app — Tiago Forte's **PARA** method (Projects / Areas / Resources) combined with Scrum-style weekly sprints, a Kanban board, and a daily dashboard. Single-user, self-hostable, runs on your own machine.

## Features

- **PARA entities**: Projects (completable outcomes, hierarchical), Areas (ongoing life domains), Resources (saved notes / URLs / clippings)
- **Tasks** with subtasks, Eisenhower prioritization (urgency × importance), estimates, due dates
- **Weekly sprints** (Sunday → Saturday) with a 5-column **Kanban board** (drag-and-drop via dnd-kit, keyboard-accessible)
- **Sprint planning view** with capacity sum and per-area balance
- **Dashboard** showing the current sprint, in-progress tasks, tasks due today, stale items, weekly focus per area, and recent resources — all in a single request
- **Polymorphic tags** across every entity type
- **Bidirectional references** between any two entities (backlinks panel on every detail page)
- **Archive-only lifecycle** — deletes are soft, undoable, and reference links persist so you never lose history
- **Timezone-aware** sprint and due-date math (browser auto-detects your IANA timezone on first load)

## Stack

- **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS + React Query + Zustand + dnd-kit + react-hook-form
- **Backend:** Node 20 + Fastify 5 + TypeScript + Prisma 6 + PostgreSQL 16
- **Shared:** pnpm workspace package with hand-written Zod schemas as the single API contract
- **Tests:** Vitest + real-Postgres integration tests (no DB mocks) + React Testing Library smoke tests

## Prerequisites

- **Node 20 or later** (Node 22 works; pinned in `.nvmrc`)
- **Docker** with Docker Compose — for the Postgres container
- **Git**

That's it. `pnpm` is installed automatically via `corepack` in the setup steps below.

## Quick start

Clone the repo, then run the setup script. It checks prerequisites, creates `.env`, enables pnpm, and bootstraps the database — all in one command.

**Linux / macOS:**

```bash
git clone git@github.com:cbockenstette-commits/lifeos.git lifeos
cd lifeos
bash scripts/setup.sh
```

**Windows (PowerShell):**

```powershell
git clone git@github.com:cbockenstette-commits/lifeos.git lifeos
cd lifeos
powershell -ExecutionPolicy Bypass -File scripts\setup.ps1
```

The script will tell you if anything is missing and how to install it. Once it finishes, run `pnpm dev` to start the dev servers.

## Manual setup

> If you ran `setup.sh` or `setup.ps1` above, skip this section.

```bash
# 1. Clone the repo
git clone git@github.com:cbockenstette-commits/lifeos.git lifeos
cd lifeos

# 2. Enable pnpm via corepack (no sudo, no global install)
mkdir -p ~/.local/bin
corepack enable --install-directory ~/.local/bin
export PATH="$HOME/.local/bin:$PATH"   # add this to your shell rc file too
pnpm --version                          # should print 10.x

# 3. Copy the env template
cp .env.example .env
# The default .env works for a clean machine with no other Postgres on 5432.
# If you already run Postgres on 5432, edit .env and change POSTGRES_PORT to
# 5433 (or any free port) before running docker compose.

# 4. Bootstrap the database (starts Postgres, installs deps, runs migrations,
#    seeds the local user) — all in one command:
pnpm bootstrap

# 5. Start the dev servers (API on 127.0.0.1:3000, web on 127.0.0.1:5173)
pnpm dev
```

Open **<http://127.0.0.1:5173>** in your browser.

On first load the app calls `GET /api/users/me` and auto-detects your browser's IANA timezone — if it differs from the seeded default (`America/Boise`), it silently updates the user row so every sprint and due-date calculation respects wherever you are.

## Running tests

```bash
# All tests (backend integration + frontend RTL smoke)
pnpm test

# Just the backend (89 integration tests against a real Postgres test DB)
pnpm --filter api test

# Just the frontend (16 RTL smoke tests in jsdom)
pnpm --filter web test

# Typecheck across all workspaces
pnpm typecheck
```

The backend tests connect to a `lifeos_test` database on the same docker Postgres instance. `pnpm bootstrap` does NOT create it for you — run this once before the first test run:

```bash
docker exec lifeos-postgres psql -U lifeos -d lifeos -c "CREATE DATABASE lifeos_test;"
DATABASE_URL="postgresql://lifeos:lifeos@127.0.0.1:5433/lifeos_test?schema=public" \
  pnpm --filter api prisma migrate deploy
```

(Adjust port 5433 → 5432 if your `.env` uses the default.)

## Project layout

```
lifeos/
├── apps/
│   ├── api/                # Fastify + Prisma backend
│   │   ├── prisma/         # schema.prisma + migrations + seed.ts
│   │   ├── src/
│   │   │   ├── plugins/    # Fastify plugins (prisma, error-handler, auth-stub)
│   │   │   ├── routes/     # One module per entity
│   │   │   ├── services/   # archive, current-sprint, entity-links, hydrate, dashboard
│   │   │   └── lib/        # week math, prioritize, coerce helpers
│   │   └── tests/          # integration tests against real Postgres
│   └── web/                # Vite + React frontend
│       └── src/
│           ├── api/        # mutations.ts (invalidateDashboard helper)
│           ├── components/ # layout, ui primitives, forms, kanban, dashboard, tags, links
│           ├── hooks/      # one hook file per entity
│           ├── lib/        # api-client, query-keys, form-errors
│           ├── pages/      # one page per route
│           ├── stores/     # Zustand UI-only store
│           └── tests/      # React Testing Library smoke tests
├── packages/
│   └── shared/             # Zod schemas + enums + pure date helpers
├── scripts/
│   ├── setup.sh             # Quick-start setup for Linux/macOS
│   └── setup.ps1            # Quick-start setup for Windows
├── docker-compose.yml      # postgres:16-alpine
├── pnpm-workspace.yaml
├── package.json            # Root scripts (dev, test, typecheck, bootstrap)
├── ARCHITECTURE.md         # ADRs + schema evolution recipes
└── README.md               # This file
```

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Run API and web in parallel |
| `pnpm dev:api` | Run just the API |
| `pnpm dev:web` | Run just the web dev server |
| `pnpm build` | Build every workspace |
| `pnpm test` | Run all tests |
| `pnpm typecheck` | Typecheck all workspaces |
| `pnpm db:migrate` | `prisma migrate dev` on the api workspace |
| `pnpm db:seed` | Re-seed the local user |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm bootstrap` | docker up + install + migrate + seed (first-time setup) |

## Daily demo walkthrough

Once the app is running, this walkthrough exercises the full v1 feature set:

1. Open **Areas** → "+ New area" → create "Health" with a green color
2. Open the area → "+ New project" (from Projects page, with area filter pre-set) → create "Run a 5k"
3. Open the project → "+ New task" → "Buy running shoes" with urgency 2, importance 3, estimate 30min
4. Repeat for a few more tasks
5. Open **Sprints** → "Start this week's sprint" → opens the Kanban board
6. Click "Plan" in the sprint header → drag tasks from Backlog into In Sprint → capacity and area balance update live
7. Back on the board → drag "Buy running shoes" from Backlog → To Do → In Progress. Reload. It's still there.
8. Open **Resources** → "+ New resource" → save a URL like "Couch to 5k Plan"
9. Open the "Buy running shoes" task → References section → "+ Link" → pick the resource → save
10. Open the Couch to 5k resource → References shows "Referenced by: Buy running shoes". **Bidirectional link proven.**
11. On the Health area page → Tags section → type "fitness" and press Enter. Repeat for the project and resource.
12. Click the **fitness** tag chip → see all three entities grouped by type. **Polymorphic tagging proven.**
13. Open **Dashboard** — current sprint summary, in-progress count, due today, this-week focus per area, recent resources
14. Archive the "Buy running shoes" task → it disappears from the task list. Toggle "Show archived" → strike-through. Open Couch to 5k → the backlink is hidden. Unarchive → it reappears in both places. **Soft delete + archive-aware backlinks proven.**

## Security note

The API binds to `127.0.0.1` only. There is **no authentication** in v1 by design — this is a local-only personal app. **Do not expose this to the internet without enabling real auth first.** See `ARCHITECTURE.md` → "Enable real auth (JWT bolt-on recipe)" for the upgrade path.

## Architecture

See **[`ARCHITECTURE.md`](./ARCHITECTURE.md)** for the full architectural decisions: entity model, polymorphism trade-off, archive-only lifecycle, schema evolution recipe, and recipes for adding new entity types or enabling real auth.

## Development notes

- **Polling-mode file watching** — both Vite and `tsx watch` use polling because Linux's default `fs.inotify.max_user_instances=128` limit is too low for Node's watcher pattern. Set `VITE_NO_POLL=1` to opt out if your system has higher limits.
- **Port collisions** — if `5432` is taken on your machine, set `POSTGRES_PORT=5433` (or any free port) in `.env` before `docker compose up`.
- **Test isolation** — backend integration tests TRUNCATE all tables CASCADE in `beforeEach` and re-seed the local user. This keeps tests independent without transaction plumbing. Tests run serially (one file at a time) so they don't stomp on each other.
