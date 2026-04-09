import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { makeTestApp } from './helpers/app.js';
import { resetDb } from './helpers/reset.js';

describe('tags routes', () => {
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

  it('POST creates a tag', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/tags',
      payload: { name: 'fitness', color: '#10b981' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().name).toBe('fitness');
  });

  it('attach + detach a tag to multiple entity types', async () => {
    const tag = (
      await app.inject({
        method: 'POST',
        url: '/api/tags',
        payload: { name: 'fitness' },
      })
    ).json();
    const area = (
      await app.inject({
        method: 'POST',
        url: '/api/areas',
        payload: { name: 'Health' },
      })
    ).json();
    const project = (
      await app.inject({
        method: 'POST',
        url: '/api/projects',
        payload: { name: 'Run 5k', area_id: area.id },
      })
    ).json();

    // Attach to area
    const attachArea = await app.inject({
      method: 'POST',
      url: `/api/tags/${tag.id}/attach`,
      payload: { entity_type: 'area', entity_id: area.id },
    });
    expect(attachArea.statusCode).toBe(201);

    // Attach to project
    const attachProject = await app.inject({
      method: 'POST',
      url: `/api/tags/${tag.id}/attach`,
      payload: { entity_type: 'project', entity_id: project.id },
    });
    expect(attachProject.statusCode).toBe(201);

    // Verify 2 entity_tag rows exist
    const count = await prisma.entityTag.count({ where: { tag_id: tag.id } });
    expect(count).toBe(2);

    // Detach area
    const detach = await app.inject({
      method: 'POST',
      url: `/api/tags/${tag.id}/detach`,
      payload: { entity_type: 'area', entity_id: area.id },
    });
    expect(detach.statusCode).toBe(204);

    const remaining = await prisma.entityTag.count({ where: { tag_id: tag.id } });
    expect(remaining).toBe(1);
  });

  it('attach rejects a tag attached to a non-existent entity', async () => {
    const tag = (
      await app.inject({
        method: 'POST',
        url: '/api/tags',
        payload: { name: 'fitness' },
      })
    ).json();
    const res = await app.inject({
      method: 'POST',
      url: `/api/tags/${tag.id}/attach`,
      payload: {
        entity_type: 'area',
        entity_id: '99999999-9999-9999-9999-999999999999',
      },
    });
    expect(res.statusCode).toBe(404);
  });

  it('DELETE hard-deletes a tag and cascades EntityTag rows', async () => {
    const tag = (
      await app.inject({
        method: 'POST',
        url: '/api/tags',
        payload: { name: 'fitness' },
      })
    ).json();
    const area = (
      await app.inject({
        method: 'POST',
        url: '/api/areas',
        payload: { name: 'Health' },
      })
    ).json();
    await app.inject({
      method: 'POST',
      url: `/api/tags/${tag.id}/attach`,
      payload: { entity_type: 'area', entity_id: area.id },
    });

    const del = await app.inject({
      method: 'DELETE',
      url: `/api/tags/${tag.id}`,
    });
    expect(del.statusCode).toBe(204);

    const tagRow = await prisma.tag.findUnique({ where: { id: tag.id } });
    expect(tagRow).toBeNull();
    const joinRows = await prisma.entityTag.count({ where: { tag_id: tag.id } });
    expect(joinRows).toBe(0);
  });
});
