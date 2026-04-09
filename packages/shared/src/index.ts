// @lifeos/shared — placeholder for P0
//
// This package will host hand-written Zod schemas, the EntityType enum,
// sprint date helpers, and the bidirectional EntityRef discriminated union.
// All of that lands in P1/P2. For P0 its only job is to prove the pnpm
// workspace type resolution works in Vite dev mode WITHOUT a build step.
//
// If `import { HEALTH_CHECK_NAME } from '@lifeos/shared'` resolves and
// type-checks in apps/web/src/main.tsx, the workspace plumbing is wired
// correctly and P1 can proceed.

export const HEALTH_CHECK_NAME = 'lifeos' as const;
