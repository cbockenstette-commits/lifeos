import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { makeTestApp } from './helpers/app.js';
import { resetDb } from './helpers/reset.js';

// P7 polymorphic integrity test (ADR-1).
//
// Because entity_links and entity_tags have no DB-level foreign keys on
// the polymorphic columns, we rely on app-layer assertEntityExists on
// writes. This test is the regression guard: for every row in those
// tables, its entity_id must resolve to an existing row in the correct
// entity table.
//
// Since v1 has no hard-delete path (archive-only), orphans can only
// appear from manual SQL tampering. This test catches that.

interface CountRow {
  count: bigint;
}

async function countOrphanLinks(prisma: PrismaClient): Promise<number> {
  // For each (source_type, target_type) pair, LEFT JOIN the matching
  // entity table and count rows where the joined id is NULL.
  //
  // We build the query as a single UNION of 4 source-type subqueries
  // + 4 target-type subqueries (one per EntityType).
  const rows = await prisma.$queryRaw<CountRow[]>`
    SELECT COUNT(*)::bigint AS count FROM (
      -- source_type='area' orphans
      SELECT el.id FROM "EntityLink" el
      LEFT JOIN "Area" a ON a.id = el.source_id
      WHERE el.source_type = 'area' AND a.id IS NULL
      UNION ALL
      -- source_type='project' orphans
      SELECT el.id FROM "EntityLink" el
      LEFT JOIN "Project" p ON p.id = el.source_id
      WHERE el.source_type = 'project' AND p.id IS NULL
      UNION ALL
      -- source_type='task' orphans
      SELECT el.id FROM "EntityLink" el
      LEFT JOIN "Task" t ON t.id = el.source_id
      WHERE el.source_type = 'task' AND t.id IS NULL
      UNION ALL
      -- source_type='resource' orphans
      SELECT el.id FROM "EntityLink" el
      LEFT JOIN "Resource" r ON r.id = el.source_id
      WHERE el.source_type = 'resource' AND r.id IS NULL
      UNION ALL
      -- target_type='area' orphans
      SELECT el.id FROM "EntityLink" el
      LEFT JOIN "Area" a ON a.id = el.target_id
      WHERE el.target_type = 'area' AND a.id IS NULL
      UNION ALL
      -- target_type='project' orphans
      SELECT el.id FROM "EntityLink" el
      LEFT JOIN "Project" p ON p.id = el.target_id
      WHERE el.target_type = 'project' AND p.id IS NULL
      UNION ALL
      -- target_type='task' orphans
      SELECT el.id FROM "EntityLink" el
      LEFT JOIN "Task" t ON t.id = el.target_id
      WHERE el.target_type = 'task' AND t.id IS NULL
      UNION ALL
      -- target_type='resource' orphans
      SELECT el.id FROM "EntityLink" el
      LEFT JOIN "Resource" r ON r.id = el.target_id
      WHERE el.target_type = 'resource' AND r.id IS NULL
    ) orphans
  `;
  return Number(rows[0]?.count ?? 0);
}

async function countOrphanTags(prisma: PrismaClient): Promise<number> {
  const rows = await prisma.$queryRaw<CountRow[]>`
    SELECT COUNT(*)::bigint AS count FROM (
      SELECT et.id FROM "EntityTag" et
      LEFT JOIN "Area" a ON a.id = et.entity_id
      WHERE et.entity_type = 'area' AND a.id IS NULL
      UNION ALL
      SELECT et.id FROM "EntityTag" et
      LEFT JOIN "Project" p ON p.id = et.entity_id
      WHERE et.entity_type = 'project' AND p.id IS NULL
      UNION ALL
      SELECT et.id FROM "EntityTag" et
      LEFT JOIN "Task" t ON t.id = et.entity_id
      WHERE et.entity_type = 'task' AND t.id IS NULL
      UNION ALL
      SELECT et.id FROM "EntityTag" et
      LEFT JOIN "Resource" r ON r.id = et.entity_id
      WHERE et.entity_type = 'resource' AND r.id IS NULL
    ) orphans
  `;
  return Number(rows[0]?.count ?? 0);
}

describe('Polymorphic integrity', () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;

  beforeAll(async () => {
    ({ app, prisma } = await makeTestApp());
  });

  beforeEach(async () => {
    await resetDb(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('starts with zero orphan entity_links and entity_tags', async () => {
    expect(await countOrphanLinks(prisma)).toBe(0);
    expect(await countOrphanTags(prisma)).toBe(0);
  });

  it('remains orphan-free after the normal create → link → tag flow', async () => {
    const area = (
      await app.inject({
        method: 'POST',
        url: '/api/areas',
        payload: { name: 'Health' },
      })
    ).json();
    const task = (
      await app.inject({
        method: 'POST',
        url: '/api/tasks',
        payload: { title: 'Buy shoes', area_id: area.id },
      })
    ).json();
    const resource = (
      await app.inject({
        method: 'POST',
        url: '/api/resources',
        payload: { title: 'Couch to 5k', source_kind: 'url', url: 'https://example.com' },
      })
    ).json();

    // Create an EntityLink task → resource
    await app.inject({
      method: 'POST',
      url: '/api/entity-links',
      payload: {
        source_type: 'task',
        source_id: task.id,
        target_type: 'resource',
        target_id: resource.id,
      },
    });

    // Tag all three entities
    const tag = (
      await app.inject({
        method: 'POST',
        url: '/api/tags',
        payload: { name: 'fitness' },
      })
    ).json();
    for (const ref of [
      { entity_type: 'area', entity_id: area.id },
      { entity_type: 'task', entity_id: task.id },
      { entity_type: 'resource', entity_id: resource.id },
    ]) {
      await app.inject({
        method: 'POST',
        url: `/api/tags/${tag.id}/attach`,
        payload: ref,
      });
    }

    // Verify the rows exist
    expect(await prisma.entityLink.count()).toBe(1);
    expect(await prisma.entityTag.count()).toBe(3);

    // Verify no orphans
    expect(await countOrphanLinks(prisma)).toBe(0);
    expect(await countOrphanTags(prisma)).toBe(0);
  });

  it('archiving an entity does NOT create orphans (archive != delete)', async () => {
    const area = (
      await app.inject({
        method: 'POST',
        url: '/api/areas',
        payload: { name: 'Health' },
      })
    ).json();
    const task = (
      await app.inject({
        method: 'POST',
        url: '/api/tasks',
        payload: { title: 'Buy shoes', area_id: area.id },
      })
    ).json();
    const resource = (
      await app.inject({
        method: 'POST',
        url: '/api/resources',
        payload: { title: 'Shoes link', source_kind: 'url', url: 'https://example.com' },
      })
    ).json();
    await app.inject({
      method: 'POST',
      url: '/api/entity-links',
      payload: {
        source_type: 'task',
        source_id: task.id,
        target_type: 'resource',
        target_id: resource.id,
      },
    });

    // Archive the source task.
    await app.inject({
      method: 'DELETE',
      url: `/api/tasks/${task.id}`,
    });

    // The link row still references an existing (but archived) row.
    // This is NOT an orphan — archive-only lifecycle per ADR-3.
    expect(await countOrphanLinks(prisma)).toBe(0);
  });

  it('detects an orphan if someone deletes a row via raw SQL', async () => {
    const area = (
      await app.inject({
        method: 'POST',
        url: '/api/areas',
        payload: { name: 'Will be deleted' },
      })
    ).json();
    const tag = (
      await app.inject({
        method: 'POST',
        url: '/api/tags',
        payload: { name: 'oops' },
      })
    ).json();
    await app.inject({
      method: 'POST',
      url: `/api/tags/${tag.id}/attach`,
      payload: { entity_type: 'area', entity_id: area.id },
    });

    // Hard-delete the area via raw SQL (simulating manual tampering).
    // Area → Tag has no cascade on EntityTag.entity_id (polymorphic, no FK),
    // so the entity_tags row will be orphaned.
    await prisma.$executeRawUnsafe(
      `DELETE FROM "Area" WHERE id = '${area.id}'`,
    );

    const orphans = await countOrphanTags(prisma);
    expect(orphans).toBeGreaterThanOrEqual(1);
  });
});
