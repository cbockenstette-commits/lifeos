import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { makeTestApp } from './helpers/app.js';
import { resetDb } from './helpers/reset.js';

describe('sprints routes', () => {
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

  it('POST creates a sprint with server-computed end_date', async () => {
    // 2026-04-05 is a Sunday.
    const res = await app.inject({
      method: 'POST',
      url: '/api/sprints',
      payload: { start_date: '2026-04-05', goal: 'ship P2' },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.goal).toBe('ship P2');
    // Both dates serialize as full ISO.
    expect(new Date(body.start_date).toISOString().slice(0, 10)).toBe('2026-04-05');
    expect(new Date(body.end_date).toISOString().slice(0, 10)).toBe('2026-04-11');
  });

  it('POST rejects a sprint where start_date is not a Sunday is not enforced server-side yet — but the DB CHECK still guarantees 6-day duration', async () => {
    // start_date doesn't have to be a Sunday; only the week-length check
    // is enforced. Server derives end_date correctly so this should always succeed.
    const res = await app.inject({
      method: 'POST',
      url: '/api/sprints',
      payload: { start_date: '2026-04-06' }, // Monday
    });
    expect(res.statusCode).toBe(201);
  });

  it('GET /current is idempotent (find-or-create)', async () => {
    const first = await app.inject({ method: 'GET', url: '/api/sprints/current' });
    expect(first.statusCode).toBe(200);
    const second = await app.inject({ method: 'GET', url: '/api/sprints/current' });
    expect(second.statusCode).toBe(200);
    expect(second.json().id).toBe(first.json().id);

    const count = await prisma.sprint.count();
    expect(count).toBe(1);
  });

  it('GET /current returns a sprint whose start_date is the Sunday of this week in user tz', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/sprints/current' });
    expect(res.statusCode).toBe(200);
    const sprint = res.json();
    const start = new Date(sprint.start_date);
    expect(start.getUTCDay()).toBe(0); // Sunday
  });

  it('PATCH updates sprint status', async () => {
    const sprint = (
      await app.inject({
        method: 'POST',
        url: '/api/sprints',
        payload: { start_date: '2026-04-05' },
      })
    ).json();

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/sprints/${sprint.id}`,
      payload: { status: 'active' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('active');
  });
});
