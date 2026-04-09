import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { makeTestApp } from './helpers/app.js';
import { resetDb } from './helpers/reset.js';
import { LOCAL_USER_ID } from '../src/config.js';

describe('users routes', () => {
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

  it('GET /api/users/me returns the local user', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/users/me' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.id).toBe(LOCAL_USER_ID);
    expect(body.email).toBe('me@lifeos.local');
    expect(body.timezone).toBe('America/Boise');
  });

  it('PATCH /api/users/me updates name and timezone', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/users/me',
      payload: { name: 'Cody', timezone: 'America/Los_Angeles' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.name).toBe('Cody');
    expect(body.timezone).toBe('America/Los_Angeles');
  });

  it('PATCH /api/users/me rejects an invalid timezone', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/users/me',
      payload: { timezone: 'Not/AReal/Zone' },
    });
    expect(res.statusCode).toBe(422);
  });

  it('PATCH /api/users/me rejects an empty body', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/users/me',
      payload: {},
    });
    expect(res.statusCode).toBe(422);
  });
});
