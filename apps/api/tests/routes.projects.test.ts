import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { makeTestApp } from './helpers/app.js';
import { resetDb } from './helpers/reset.js';

describe('projects routes', () => {
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

  it('POST creates a project with an area', async () => {
    const area = (
      await app.inject({
        method: 'POST',
        url: '/api/areas',
        payload: { name: 'Health' },
      })
    ).json();

    const res = await app.inject({
      method: 'POST',
      url: '/api/projects',
      payload: { name: 'Run a 5k', area_id: area.id, status: 'active' },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.name).toBe('Run a 5k');
    expect(body.area_id).toBe(area.id);
    expect(body.status).toBe('active');
  });

  it('POST rejects an empty name', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/projects',
      payload: { name: '' },
    });
    expect(res.statusCode).toBe(422);
  });

  it('GET filters by area_id', async () => {
    const areaA = (
      await app.inject({
        method: 'POST',
        url: '/api/areas',
        payload: { name: 'Health' },
      })
    ).json();
    const areaB = (
      await app.inject({
        method: 'POST',
        url: '/api/areas',
        payload: { name: 'Work' },
      })
    ).json();
    await app.inject({
      method: 'POST',
      url: '/api/projects',
      payload: { name: 'P1', area_id: areaA.id },
    });
    await app.inject({
      method: 'POST',
      url: '/api/projects',
      payload: { name: 'P2', area_id: areaB.id },
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/projects?area_id=${areaA.id}`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveLength(1);
    expect(body[0].name).toBe('P1');
  });

  it('DELETE archives the project', async () => {
    const created = (
      await app.inject({
        method: 'POST',
        url: '/api/projects',
        payload: { name: 'p' },
      })
    ).json();
    const del = await app.inject({
      method: 'DELETE',
      url: `/api/projects/${created.id}`,
    });
    expect(del.statusCode).toBe(200);
    expect(del.json().archived_at).not.toBeNull();
    const row = await prisma.project.findUnique({ where: { id: created.id } });
    expect(row).not.toBeNull();
  });
});
