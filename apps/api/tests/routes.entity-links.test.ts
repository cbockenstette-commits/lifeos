import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { makeTestApp } from './helpers/app.js';
import { resetDb } from './helpers/reset.js';

describe('entity-links routes', () => {
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

  async function seedEntities() {
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
        payload: { name: 'Run a 5k', area_id: area.id },
      })
    ).json();
    const task = (
      await app.inject({
        method: 'POST',
        url: '/api/tasks',
        payload: { title: 'Buy shoes', project_id: project.id },
      })
    ).json();
    const resource = (
      await app.inject({
        method: 'POST',
        url: '/api/resources',
        payload: { title: 'Couch to 5k', url: 'https://example.com', source_kind: 'url' },
      })
    ).json();
    return { area, project, task, resource };
  }

  it('POST creates a link between task and resource', async () => {
    const { task, resource } = await seedEntities();
    const res = await app.inject({
      method: 'POST',
      url: '/api/entity-links',
      payload: {
        source_type: 'task',
        source_id: task.id,
        target_type: 'resource',
        target_id: resource.id,
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.relation_type).toBe('references');
  });

  it('POST rejects a link whose source does not exist', async () => {
    const { resource } = await seedEntities();
    const res = await app.inject({
      method: 'POST',
      url: '/api/entity-links',
      payload: {
        source_type: 'task',
        source_id: '99999999-9999-9999-9999-999999999999',
        target_type: 'resource',
        target_id: resource.id,
      },
    });
    expect(res.statusCode).toBe(404);
  });

  it('POST rejects a link whose target does not exist', async () => {
    const { task } = await seedEntities();
    const res = await app.inject({
      method: 'POST',
      url: '/api/entity-links',
      payload: {
        source_type: 'task',
        source_id: task.id,
        target_type: 'resource',
        target_id: '99999999-9999-9999-9999-999999999999',
      },
    });
    expect(res.statusCode).toBe(404);
  });

  it('POST rejects a self-link via Zod', async () => {
    const { task } = await seedEntities();
    const res = await app.inject({
      method: 'POST',
      url: '/api/entity-links',
      payload: {
        source_type: 'task',
        source_id: task.id,
        target_type: 'task',
        target_id: task.id,
      },
    });
    expect(res.statusCode).toBe(422);
  });

  it('POST rejects an unknown relation_type', async () => {
    const { task, resource } = await seedEntities();
    const res = await app.inject({
      method: 'POST',
      url: '/api/entity-links',
      payload: {
        source_type: 'task',
        source_id: task.id,
        target_type: 'resource',
        target_id: resource.id,
        relation_type: 'parent_of',
      },
    });
    expect(res.statusCode).toBe(422);
  });

  it('GET with direction=both returns both outgoing and incoming', async () => {
    const { task, resource } = await seedEntities();
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

    // From the resource's perspective, this is an incoming link.
    const res = await app.inject({
      method: 'GET',
      url: `/api/entity-links?entity_type=resource&entity_id=${resource.id}&direction=both`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveLength(1);
    expect(body[0].source_type).toBe('task');
  });
});
