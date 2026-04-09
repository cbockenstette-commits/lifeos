# Approval Gates — lifeos v1

## Pre-P0 (APPROVED 2026-04-08)
- User approved the 10 ADRs:
  - ADR-1: Polymorphic `entity_links` table (area|project|task|resource scope) ✅
  - ADR-2: Polymorphic `entity_tags` table (same scope) ✅
  - ADR-3: Archive-only lifecycle, no hard delete path in v1 ✅
  - ADR-8: Sprint dates as `DATE`, user timezone = `America/Boise` default, browser auto-detect ✅
  - ADR-9: TRUNCATE between tests (not transactional rollback) ✅
  - ADR-5: Gapped integer `sort_order` (not LexoRank) ✅
  - Review tier: C (Codex review at end of every phase) ✅
  - No CI in v1 ✅
  - No Notion importer — permanently dropped ✅
  - Tailwind CSS ✅
- Codex external review: 3 rounds run. Final state: `revise` with `blocking_issues: []`. All blocking items addressed in rounds 1-2; final residuals were consistency polish, addressed before final.

## End of P1 (schema complete)
- `pnpm --filter api prisma migrate dev --name init` applies cleanly
- `\d+` in psql shows CHECK constraints and partial indexes
- Seed inserts exactly one User row
- Optional: Codex review of the final Prisma schema

## End of P2 (backend CRUD complete)
- All API integration tests green against real Postgres test DB
- `tests/schema-parity.test.ts` passes

## End of P5 (Kanban complete)
- Demo script steps 9-11 work interactively (drag across columns, reload persistence)
- Keyboard-only drag works (a11y smoke test)

## End of P7 (tags + refs complete)
- Demo script steps 13-15 work (bidirectional refs, polymorphic tagging)
- `tests/integrity.test.ts` passes (zero orphans)
- Optional: Codex review of entity-links service

## End of P8 (v1 done)
- Full 17-step demo script passes without consulting docs
- `pnpm test` exit 0 across all workspaces
- `pnpm typecheck` exit 0 across all workspaces
- README setup steps work on a fresh machine in under 10 minutes
- ARCHITECTURE.md complete with ER diagram, polymorphism trade-off, add-entity recipe, JWT bolt-on recipe
- Optional: Codex full system review before declaring v1 done
