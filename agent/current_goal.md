# Current Goal — lifeos v1

Build a personal life-management web app at `~/Documents/lifeos/` combining Tiago Forte's PARA method with Scrum-style weekly sprints.

**Phase:** P7 Tags + References — **COMPLETE**, awaiting Codex tier C phase-end review.
**Next:** P8 Polish (README, ARCHITECTURE.md with ER diagram + polymorphism trade-off + schema evolution recipe + add-entity recipe + JWT bolt-on recipe, empty-state polish, loading skeletons, error boundary, root pnpm scripts, v1 done).

## P7 completion evidence

### Backend — polymorphic hydrator
- `apps/api/src/services/hydrate.ts` — `hydrateEntities(prisma, userId, refs, options)`:
  - Groups refs by type
  - Fires ONE `findMany({ where: { id: { in: [...] } } })` per distinct type
  - Returns compact display cards: `{ type, id, title, archived_at, secondary, color }`
  - Default filters archived entities; `includeArchived=true` opts out
- `packages/shared/src/schemas/hydrated.ts` — `HydratedEntitySchema`, `TagEntitiesSchema`, `HydratedLinkEdgeSchema`, `HydratedLinksSchema`

### New endpoints
- `GET /api/tags/:id/entities` — returns `{ area, project, task, resource }` with hydrated entities for that tag
- `GET /api/entity-links/hydrated?entity_type=X&entity_id=Y` — returns `{ outgoing, incoming }` with each edge's other-end entity hydrated in a single response. Both directions fetched in parallel; one hydrator call for all targets; O(1) Map lookup to match edges to their hydrated entities. **No N+1.**

### Backend — integrity test (P7 guardrail)
- `apps/api/tests/integrity.test.ts` — **4 tests**:
  - Clean DB: zero orphans in both `entity_links` and `entity_tags`
  - After normal create → link → tag flow: still zero orphans
  - After archive (soft delete): still zero orphans (archive ≠ delete per ADR-3)
  - After raw SQL hard-delete of a referenced area: orphan count ≥ 1 — proves the guard fires when someone tampers

### Frontend hooks
- `hooks/use-tags.ts` — `useTags`, `useTag`, `useTagEntities`, `useCreateTag`, `useUpdateTag`, `useDeleteTag`, `useAttachTag`, `useDetachTag`, `useEntityTags` (for "tags on this entity X")
- `hooks/use-backlinks.ts` — `useBacklinks` (hydrated), `useCreateEntityLink`, `useDeleteEntityLink`
- All mutations invalidate `['tags', ...]` and `['backlinks']` query keys

### Frontend components
- `components/tags/tag-chip.tsx` — pill with color dot + optional remove button + Link to `/tags/:id`
- `components/tags/tag-picker.tsx` — combobox input with create-on-enter, exact-match-detection, suggestion list, inline chip remove
- `components/links/entity-badge.tsx` — type badge + title + archived strike-through + optional remove button; uses type-specific color classes (emerald/blue/amber/purple for area/project/task/resource)
- `components/links/link-picker.tsx` — modal with type dropdown + search input + filtered list; client-side self-link exclusion
- `components/links/backlinks-panel.tsx` — "References" card with "Links to" (outgoing) and "Referenced by" (incoming) sections, inline + Link button to open the picker

### Wired into all 4 entity detail pages
- `area-detail-page.tsx` — Tags section (`<TagPicker entity_type="area" entity_id={a.id} />`) + `<BacklinksPanel />`
- `project-detail-page.tsx` — same pattern
- `task-detail-page.tsx` — same pattern
- `resource-detail-page.tsx` — same pattern
- Every detail page now has both tagging and bidirectional linking

### New pages
- `tags-page.tsx` — rewritten from placeholder: list of tag chips clickable to detail, "+ New tag" modal with react-hook-form + zodResolver
- `tag-detail-page.tsx` — NEW: `#tagname` header, 4 sections (Areas / Projects / Tasks / Resources) each rendering `<EntityBadge />` rows, total count, delete-tag button with confirm dialog. **Satisfies demo script step 15**: "click tag chip to see all linked entities grouped by type"

### Routes
- `App.tsx` adds `/tags/:id` route for tag detail page

### Tests
- **Backend** `tests/integrity.test.ts` — 4 tests (described above), **89/89** total backend tests passing (was 85; +4)
- **Frontend** `src/tests/backlinks-panel.test.tsx` — **2 tests**:
  - Renders hydrated outgoing + incoming edges with real data
  - Shows empty state on zero edges
  - Uses `mockImplementation` with a URL-aware factory to return fresh `Response` objects per call (`mockResolvedValue` of a single shared Response failed because `Response.body` is a one-shot stream and the LinkPicker's eager useAreas/useProjects/useTasks/useResources queries consumed it first)

### Verification
- `pnpm -r typecheck` clean ✅
- **Backend: 89/89 tests passing** (was 85; +4 integrity)
- **Frontend: 14/14 tests passing** (was 12; +2 backlinks)

### Codex P6 advisory coverage
- ✅ Polymorphic hydrator is batched by type (≤N queries for N distinct types)
- ✅ Backlinks endpoint returns single round-trip with hydrated data
- ✅ Tag detail satisfies demo step 15 (grouped by type)
- ✅ Archive-only lifecycle honored (link/tag rows persist through entity archive)
- ✅ Integrity test proves orphans can only come from manual tampering

### Deviation log (P7)
1. **`useEntityTags` hook is O(tag_count)** — fetches all tags and per-tag entities to compute "which tags are attached to this entity". Acceptable at v1 single-user scale. A dedicated `GET /api/entities/{type}/{id}/tags` endpoint would be the optimization; deferred to a refinement phase.
2. **Client-side self-link exclusion** in `LinkPicker` because the server already has a CHECK constraint but the picker should never offer self as a target anyway.
3. **`mockImplementation` with URL factory** in the backlinks test instead of `mockResolvedValue` — necessary because Response body streams are single-consumption and the LinkPicker's sibling hooks fire first.
