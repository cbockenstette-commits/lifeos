# Current Goal — lifeos v1

Build a personal life-management web app at `~/Documents/lifeos/` combining Tiago Forte's PARA method with Scrum-style weekly sprints.

**Phase:** P3 Frontend shell + routing — **COMPLETE**, awaiting Codex tier C phase-end review.
**Next:** P4 PARA Views (Areas, Projects, Tasks, Resources) — list + detail + create/edit, react-hook-form + shared Zod schemas, URL-param sort/filter, archive toggle.

## P3 completion evidence

### Typed API client + query keys
- `apps/web/src/lib/api-client.ts` — `apiFetch<T>()` fetch wrapper with `Bearer DEV` placeholder Authorization header (ADR-7 1-line JWT swap surface). Throws typed `ApiError` on non-2xx with status, code, details. Convenience `api.get/post/patch/delete` verbs.
- `apps/web/src/lib/query-keys.ts` — every React Query key centralized by entity. No inline string arrays.

### Mutation ownership (Codex P1 advisory fulfilled)
- `apps/web/src/api/mutations.ts` — `createQueryClient()` with sensible defaults (30s staleTime, refetchOnWindowFocus, retry:1) + canonical `invalidateDashboard(queryClient)` helper. Introduced in P3 before any mutation hook exists so downstream phases have a single import target and structurally-hard-to-forget dashboard invalidation.

### Zustand UI store (UI-local only)
- `apps/web/src/stores/ui-store.ts` — persists only `sidebarOpen` (durable preference). `activeModal` resets on reload. ZERO server-state duplication.

### Layout components
- `components/layout/sidebar.tsx` — Tailwind-styled nav with NavLink active highlighting, conditional render based on `sidebarOpen`
- `components/layout/topbar.tsx` — hamburger toggle + `useCurrentUser` display (name + timezone)
- `components/layout/page-shell.tsx` — sidebar + topbar + React Router `<Outlet />`
- `components/page-header.tsx` — reusable page title + subtitle + actions slot
- `components/placeholder-panel.tsx` — reusable "coming in P{N}" panel used by every page placeholder

### Placeholder pages (one per nav item)
- `dashboard-page.tsx`, `areas-page.tsx`, `projects-page.tsx`, `tasks-page.tsx`, `resources-page.tsx`, `sprints-page.tsx`, `tags-page.tsx`, `not-found-page.tsx`

### Hooks
- `hooks/use-current-user.ts` — `useCurrentUser()` uses React Query to fetch `/api/users/me`, **performs ADR-8 browser timezone auto-detect**: on first load, if `Intl.DateTimeFormat().resolvedOptions().timeZone` differs from the user's stored timezone, PATCH it via `/api/users/me`. `useRef` guard prevents loop. `useUpdateCurrentUser()` for manual edits.

### Providers + routing
- `main.tsx` — `QueryClientProvider` + `BrowserRouter` + `<App />` in `<React.StrictMode>`
- `App.tsx` — React Router nested routes all under `<PageShell />`: `/` dashboard, `/areas`, `/projects`, `/tasks`, `/resources`, `/sprints`, `/tags`, catch-all `/*` NotFound

### API bug fix (discovered during P3 verify)
- `/health` moved to BOTH `/health` and `/api/health`. The `/health`-only mount couldn't be reached through Vite's `/api/*` proxy. Now both paths return the same handler. `/health` stays for future docker healthchecks / ops tooling; `/api/health` satisfies the Codex acceptance criterion that "Vite proxy successfully reaches the backend health endpoint through /api/health".

### Verified via curl (Vite proxy → API backend)
- `GET /api/health` → `{"status":"ok","service":"lifeos",...}` via both direct and proxy ✅
- `GET /api/users/me` → user row with correct email/name/timezone via proxy ✅
- `GET /` → index.html with React Refresh + /src/main.tsx entry ✅
- `GET /projects` → client-routed, returns same index.html (BrowserRouter handles it on the client) ✅

### Codex P2 advisory resolution
- ✅ Typed API client implemented and consumable: `useCurrentUser` uses `api.get<User>('/users/me')` and `api.patch<User>('/users/me', body)`
- ✅ `invalidateDashboard()` exports from `apps/web/src/api/mutations.ts`, type-checks from a consumer (no consumer yet — lands in P4 — but the export is ready)
- ✅ Web imports `@lifeos/shared` (not just HEALTH_CHECK_NAME this time — now `User`, `UserUpdate`) and passes typecheck
- ✅ Zustand has UI-local state only (sidebarOpen, activeModal; no entity data)
- ✅ Tailwind styles render in the shell (classes resolved via compiled CSS)
- ✅ ADR-8 browser TZ auto-detect wired in `use-current-user.ts` (the Codex P2 open question "defer or wire now?" resolved to wire now)

### Deviation log (P3)
1. `/health` also mounted at `/api/health` — needed for Vite proxy reachability. Not in the original plan file but a natural acceptance-criterion fix.
