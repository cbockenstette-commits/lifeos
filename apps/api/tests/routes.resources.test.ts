import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { makeTestApp } from './helpers/app.js';
import { resetDb } from './helpers/reset.js';

describe('resources routes', () => {
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

  it('POST creates a url resource', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/resources',
      payload: {
        title: 'Couch to 5k',
        url: 'https://example.com/c25k',
        source_kind: 'url',
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().source_kind).toBe('url');
  });

  it('POST rejects a malformed url', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/resources',
      payload: { title: 'Bad', url: 'not-a-url' },
    });
    expect(res.statusCode).toBe(422);
  });

  it('DELETE archives the resource', async () => {
    const created = (
      await app.inject({
        method: 'POST',
        url: '/api/resources',
        payload: { title: 'Note', body_md: 'hi' },
      })
    ).json();
    const del = await app.inject({
      method: 'DELETE',
      url: `/api/resources/${created.id}`,
    });
    expect(del.statusCode).toBe(200);
    expect(del.json().archived_at).not.toBeNull();
    const row = await prisma.resource.findUnique({ where: { id: created.id } });
    expect(row).not.toBeNull();
  });
});
