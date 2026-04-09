import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

// P1 guardrail: assert that every CHECK constraint and partial index that
// lives OUTSIDE schema.prisma (i.e. in the raw SQL block appended to each
// migration.sql) is actually present in Postgres. This is the regression
// detector for "Prisma migrate dev clobbered the raw SQL block" — a real
// risk because Prisma generates fresh migration.sql files on every schema
// change and does NOT carry forward the hand-appended constraints.
//
// See next_task.md ADR-1 / ADR-3 and ARCHITECTURE.md "schema evolution"
// (added in P8) for the recipe when adding new migrations.

const prisma = new PrismaClient();

interface CheckConstraintRow {
  conname: string;
  definition: string;
}

interface PartialIndexRow {
  indexname: string;
  indexdef: string;
}

describe('P1 schema constraints guardrail', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('CHECK constraints from raw SQL block', () => {
    it('Task.task_parent_xor exists and enforces true XOR', async () => {
      const rows = await prisma.$queryRaw<CheckConstraintRow[]>`
        SELECT conname, pg_get_constraintdef(oid) AS definition
        FROM pg_constraint
        WHERE conname = 'task_parent_xor'
      `;
      expect(rows).toHaveLength(1);
      // true XOR uses <> (not equal) between nullability checks
      expect(rows[0]?.definition).toMatch(/IS NULL/);
      expect(rows[0]?.definition).toMatch(/<>/);
    });

    it('Sprint.sprint_week_check exists and enforces 6-day interval', async () => {
      const rows = await prisma.$queryRaw<CheckConstraintRow[]>`
        SELECT conname, pg_get_constraintdef(oid) AS definition
        FROM pg_constraint
        WHERE conname = 'sprint_week_check'
      `;
      expect(rows).toHaveLength(1);
      expect(rows[0]?.definition).toMatch(/6 days/);
    });

    it('EntityLink.entity_link_no_self exists and prevents self-links', async () => {
      const rows = await prisma.$queryRaw<CheckConstraintRow[]>`
        SELECT conname, pg_get_constraintdef(oid) AS definition
        FROM pg_constraint
        WHERE conname = 'entity_link_no_self'
      `;
      expect(rows).toHaveLength(1);
      expect(rows[0]?.definition).toMatch(/source_type/);
      expect(rows[0]?.definition).toMatch(/target_type/);
    });

    it('EntityLink.entity_link_relation_check whitelists only references/blocks/depends_on', async () => {
      const rows = await prisma.$queryRaw<CheckConstraintRow[]>`
        SELECT conname, pg_get_constraintdef(oid) AS definition
        FROM pg_constraint
        WHERE conname = 'entity_link_relation_check'
      `;
      expect(rows).toHaveLength(1);
      const def = rows[0]?.definition ?? '';
      expect(def).toMatch(/references/);
      expect(def).toMatch(/blocks/);
      expect(def).toMatch(/depends_on/);
      // parent_of is intentionally removed (Project/Task use native parent_id)
      expect(def).not.toMatch(/parent_of/);
    });
  });

  describe('Archive-filter partial indexes (ADR-3)', () => {
    const partialIndexes = [
      { table: 'Area', index: 'idx_Area_active' },
      { table: 'Project', index: 'idx_Project_active' },
      { table: 'Task', index: 'idx_Task_active' },
      { table: 'Resource', index: 'idx_Resource_active' },
    ] as const;

    for (const { table, index } of partialIndexes) {
      it(`${index} exists and filters on archived_at IS NULL`, async () => {
        const rows = await prisma.$queryRaw<PartialIndexRow[]>`
          SELECT indexname, indexdef
          FROM pg_indexes
          WHERE indexname = ${index}
            AND tablename = ${table}
        `;
        expect(rows).toHaveLength(1);
        expect(rows[0]?.indexdef).toMatch(/archived_at IS NULL/);
      });
    }
  });

  describe('XOR enforcement against real inserts', () => {
    // These tests actually exercise the CHECK constraints against the
    // database — proving the constraint is not just declared but enforced.

    it('Task with neither project_id nor area_id is rejected', async () => {
      await expect(
        prisma.$executeRaw`
          INSERT INTO "Task" (id, user_id, title, status, urgency, importance, priority_score, sort_order, created_at, updated_at)
          VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000001'::uuid, 'orphan', 'backlog', 0, 0, 0, 1000, NOW(), NOW())
        `,
      ).rejects.toThrow();
    });

    it('Sprint where end_date != start_date + 6 days is rejected', async () => {
      await expect(
        prisma.$executeRaw`
          INSERT INTO "Sprint" (id, user_id, start_date, end_date, status, created_at, updated_at)
          VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000001'::uuid, '2026-04-05'::date, '2026-04-10'::date, 'planned', NOW(), NOW())
        `,
      ).rejects.toThrow();
    });

    it('EntityLink where source == target is rejected', async () => {
      const sameId = '11111111-1111-1111-1111-111111111111';
      await expect(
        prisma.$executeRaw`
          INSERT INTO "EntityLink" (id, user_id, source_type, source_id, target_type, target_id, relation_type, created_at)
          VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000001'::uuid, 'task'::"EntityType", ${sameId}::uuid, 'task'::"EntityType", ${sameId}::uuid, 'references', NOW())
        `,
      ).rejects.toThrow();
    });

    it('EntityLink with unknown relation_type is rejected', async () => {
      await expect(
        prisma.$executeRaw`
          INSERT INTO "EntityLink" (id, user_id, source_type, source_id, target_type, target_id, relation_type, created_at)
          VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000001'::uuid, 'task'::"EntityType", gen_random_uuid(), 'resource'::"EntityType", gen_random_uuid(), 'parent_of', NOW())
        `,
      ).rejects.toThrow();
    });
  });
});
