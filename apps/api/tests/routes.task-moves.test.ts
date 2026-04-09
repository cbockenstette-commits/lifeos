import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { makeTestApp } from './helpers/app.js';
import { resetDb } from './helpers/reset.js';

// P5 integration test: Kanban task moves via PATCH /api/tasks/:id.
//
// Covers:
//   - Assigning a task to a sprint (set sprint_id)
//   - Cross-column move (change status)
//   - Within-column reorder (change sort_order)
//   - Unassigning a task from a sprint (sprint_id: null)
//   - Combined update: status + sort_order + sprint_id in one PATCH

describe('Kanban task moves', () => {
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

  async function seed() {
    const area = (
      await app.inject({
        method: 'POST',
        url: '/api/areas',
        payload: { name: 'Health' },
      })
    ).json();
    const sprint = (
      await app.inject({
        method: 'POST',
        url: '/api/sprints',
        payload: { start_date: '2026-04-05' },
      })
    ).json();
    const makeTask = async (title: string, sort_order: number) => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/tasks',
        payload: { title, area_id: area.id, sort_order },
      });
      return res.json();
    };
    return {
      sprint,
      area,
      taskA: await makeTask('A', 1000),
      taskB: await makeTask('B', 2000),
      taskC: await makeTask('C', 3000),
    };
  }

  it('assigns a task to a sprint and persists sprint_id', async () => {
    const { sprint, taskA } = await seed();
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/tasks/${taskA.id}`,
      payload: { sprint_id: sprint.id },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().sprint_id).toBe(sprint.id);
  });

  it('cross-column move changes status and persists', async () => {
    const { sprint, taskA } = await seed();
    // Assign first
    await app.inject({
      method: 'PATCH',
      url: `/api/tasks/${taskA.id}`,
      payload: { sprint_id: sprint.id },
    });
    // Move backlog → in_progress
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/tasks/${taskA.id}`,
      payload: { status: 'in_progress', sort_order: 500 },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('in_progress');
    expect(res.json().sort_order).toBe(500);
  });

  it('within-column reorder via sort_order persists and reloads correctly', async () => {
    const { sprint, taskA, taskB, taskC } = await seed();
    // Assign all three to the sprint.
    for (const t of [taskA, taskB, taskC]) {
      await app.inject({
        method: 'PATCH',
        url: `/api/tasks/${t.id}`,
        payload: { sprint_id: sprint.id, status: 'todo' },
      });
    }
    // Move C to the top (before A).
    await app.inject({
      method: 'PATCH',
      url: `/api/tasks/${taskC.id}`,
      payload: { sort_order: 500 },
    });

    // Fetch the sprint's tasks ordered by sort_order.
    const list = await app.inject({
      method: 'GET',
      url: `/api/tasks?sprint_id=${sprint.id}`,
    });
    const sorted = (list.json() as Array<{ id: string; sort_order: number }>)
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order);
    expect(sorted.map((t) => t.id)).toEqual([taskC.id, taskA.id, taskB.id]);
  });

  it('unassigns a task from a sprint', async () => {
    const { sprint, taskA } = await seed();
    await app.inject({
      method: 'PATCH',
      url: `/api/tasks/${taskA.id}`,
      payload: { sprint_id: sprint.id },
    });
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/tasks/${taskA.id}`,
      payload: { sprint_id: null },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().sprint_id).toBeNull();
  });

  it('combined status + sort_order + sprint_id update in one PATCH', async () => {
    const { sprint, taskA } = await seed();
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/tasks/${taskA.id}`,
      payload: {
        sprint_id: sprint.id,
        status: 'review',
        sort_order: 2500,
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.sprint_id).toBe(sprint.id);
    expect(body.status).toBe('review');
    expect(body.sort_order).toBe(2500);
  });
});
