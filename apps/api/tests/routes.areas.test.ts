import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { makeTestApp } from './helpers/app.js';
import { resetDb } from './helpers/reset.js';

describe('areas routes', () => {
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

  it('POST creates an area and returns 201', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/areas',
      payload: { name: 'Health', color: '#10b981' },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.name).toBe('Health');
    expect(body.color).toBe('#10b981');
    expect(body.archived_at).toBeNull();
  });

  it('GET lists only non-archived areas by default', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/areas',
      payload: { name: 'Active' },
    });
    const created = (
      await app.inject({
        method: 'POST',
        url: '/api/areas',
        payload: { name: 'Archived' },
      })
    ).json();
    await app.inject({ method: 'DELETE', url: `/api/areas/${created.id}` });

    const res = await app.inject({ method: 'GET', url: '/api/areas' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveLength(1);
    expect(body[0].name).toBe('Active');
  });

  it('GET ?includeArchived=true reveals archived areas', async () => {
    const created = (
      await app.inject({
        method: 'POST',
        url: '/api/areas',
        payload: { name: 'Health' },
      })
    ).json();
    await app.inject({ method: 'DELETE', url: `/api/areas/${created.id}` });

    const res = await app.inject({
      method: 'GET',
      url: '/api/areas?includeArchived=true',
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveLength(1);
    expect(body[0].archived_at).not.toBeNull();
  });

  it('POST rejects an empty name', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/areas',
      payload: { name: '' },
    });
    expect(res.statusCode).toBe(422);
  });

  it('GET /:id returns 404 for unknown area', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/areas/99999999-9999-9999-9999-999999999999',
    });
    expect(res.statusCode).toBe(404);
  });

  it('PATCH updates an area', async () => {
    const created = (
      await app.inject({
        method: 'POST',
        url: '/api/areas',
        payload: { name: 'Health' },
      })
    ).json();
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/areas/${created.id}`,
      payload: { color: '#3b82f6' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().color).toBe('#3b82f6');
  });

  it('POST /:id/unarchive restores an archived area', async () => {
    const created = (
      await app.inject({
        method: 'POST',
        url: '/api/areas',
        payload: { name: 'Health' },
      })
    ).json();
    await app.inject({ method: 'DELETE', url: `/api/areas/${created.id}` });
    const restore = await app.inject({
      method: 'POST',
      url: `/api/areas/${created.id}/unarchive`,
    });
    expect(restore.statusCode).toBe(200);
    expect(restore.json().archived_at).toBeNull();

    // Now shows up in default list again.
    const list = await app.inject({ method: 'GET', url: '/api/areas' });
    expect(list.json()).toHaveLength(1);
  });

  it('DELETE archives rather than hard-deletes', async () => {
    const created = (
      await app.inject({
        method: 'POST',
        url: '/api/areas',
        payload: { name: 'Health' },
      })
    ).json();
    const del = await app.inject({
      method: 'DELETE',
      url: `/api/areas/${created.id}`,
    });
    expect(del.statusCode).toBe(200);
    expect(del.json().archived_at).not.toBeNull();
    // Row still exists in the DB.
    const row = await prisma.area.findUnique({ where: { id: created.id } });
    expect(row).not.toBeNull();
  });
});
