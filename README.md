# lifeos

A personal life management app — PARA method (Projects / Areas / Resources) combined with Scrum-style weekly sprints, Kanban boards, and a daily dashboard. Single-user, self-hostable.

## Stack

- **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS + React Query + Zustand + dnd-kit
- **Backend:** Node 20 + Fastify + TypeScript + Prisma
- **Database:** PostgreSQL 16
- **Monorepo:** pnpm workspaces (`apps/api`, `apps/web`, `packages/shared`)

## Prerequisites

- Node 20 or later (Node 22 works)
- [Docker](https://docs.docker.com/get-docker/) + Docker Compose
- pnpm — if you don't have it: `corepack enable --install-directory ~/.local/bin` (then make sure `~/.local/bin` is on your PATH)
- Git (for version control)

## Setup

```bash
# Clone and enter the repo
git clone <your-repo-url> lifeos
cd lifeos

# Enable pnpm via corepack if needed
corepack enable --install-directory ~/.local/bin

# Copy the env template
cp .env.example .env

# Start Postgres
docker compose up -d postgres

# Install dependencies
pnpm install

# Run Prisma migrations and seed the initial user (available after P1)
# pnpm --filter api prisma migrate dev
# pnpm --filter api prisma db seed

# Start both API and web in dev mode
pnpm dev
```

- API: <http://127.0.0.1:3000> (health check at `/health`)
- Web: <http://127.0.0.1:5173>

## Project Layout

```
lifeos/
├── apps/
│   ├── api/         # Fastify + Prisma backend
│   └── web/         # Vite + React frontend
├── packages/
│   └── shared/      # Shared Zod schemas, enums, types
├── docker-compose.yml
├── pnpm-workspace.yaml
└── README.md
```

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Run API and web in parallel |
| `pnpm dev:api` | Run API only |
| `pnpm dev:web` | Run web only |
| `pnpm build` | Build all workspaces |
| `pnpm test` | Run all tests |
| `pnpm typecheck` | Typecheck all workspaces |
| `pnpm bootstrap` | `docker compose up -d postgres && pnpm install` |

## Security Note

The API binds to `127.0.0.1` only. There is no authentication in v1 by design — exposing lifeos beyond `localhost` requires enabling the auth hook in `apps/api/src/plugins/auth-stub.ts` first. See `ARCHITECTURE.md` (added in P8) for the JWT bolt-on recipe.

## Status

Currently in **P0 — Scaffolding**. See `agent/next_task.md` for the full v1 plan.
