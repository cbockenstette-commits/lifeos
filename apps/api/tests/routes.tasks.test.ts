import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { makeTestApp } from './helpers/app.js';
import { resetDb } from './helpers/reset.js';

describe('tasks routes', () => {
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

  async function createArea(name = 'Health') {
    const res = await app.inject({
      method: 'POST',
      url: '/api/areas',
      payload: { name },
    });
    return res.json();
  }

  async function createProject(area_id: string, name = 'Run a 5k') {
    const res = await app.inject({
      method: 'POST',
      url: '/api/projects',
      payload: { name, area_id },
    });
    return res.json();
  }

  it('POST creates a task under a project', async () => {
    const area = await createArea();
    const project = await createProject(area.id);
    const res = await app.inject({
      method: 'POST',
      url: '/api/tasks',
      payload: {
        title: 'Buy running shoes',
        project_id: project.id,
        urgency: 2,
        importance: 3,
        estimate_minutes: 30,
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.title).toBe('Buy running shoes');
    expect(body.project_id).toBe(project.id);
    expect(body.area_id).toBeNull();
    expect(body.priority_score).toBe(2 * 1.5 + 3); // computed from Eisenhower
  });

  it('POST creates a task standalone under an area', async () => {
    const area = await createArea();
    const res = await app.inject({
      method: 'POST',
      url: '/api/tasks',
      payload: { title: 'Standalone', area_id: area.id },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().area_id).toBe(area.id);
    expect(res.json().project_id).toBeNull();
  });

  it('POST rejects a task with neither project_id nor area_id (XOR)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/tasks',
      payload: { title: 'Orphan' },
    });
    expect(res.statusCode).toBe(422);
  });

  it('POST rejects a task with both project_id and area_id (XOR)', async () => {
    const area = await createArea();
    const project = await createProject(area.id);
    const res = await app.inject({
      method: 'POST',
      url: '/api/tasks',
      payload: { title: 'Both', project_id: project.id, area_id: area.id },
    });
    expect(res.statusCode).toBe(422);
  });

  it('PATCH rejects a task update that breaks XOR', async () => {
    const area = await createArea();
    const project = await createProject(area.id);
    const task = (
      await app.inject({
        method: 'POST',
        url: '/api/tasks',
        payload: { title: 't', project_id: project.id },
      })
    ).json();

    // Try to also attach an area while keeping project.
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/tasks/${task.id}`,
      payload: { area_id: area.id },
    });
    expect(res.statusCode).toBe(422);
  });

  it('PATCH recomputes priority_score when urgency/importance change', async () => {
    const area = await createArea();
    const task = (
      await app.inject({
        method: 'POST',
        url: '/api/tasks',
        payload: { title: 't', area_id: area.id, urgency: 1, importance: 1 },
      })
    ).json();
    expect(task.priority_score).toBe(2.5); // 1 * 1.5 + 1

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/tasks/${task.id}`,
      payload: { urgency: 3, importance: 3 },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().priority_score).toBe(7.5); // 3 * 1.5 + 3
  });

  it('DELETE archives the task', async () => {
    const area = await createArea();
    const task = (
      await app.inject({
        method: 'POST',
        url: '/api/tasks',
        payload: { title: 't', area_id: area.id },
      })
    ).json();
    const del = await app.inject({
      method: 'DELETE',
      url: `/api/tasks/${task.id}`,
    });
    expect(del.statusCode).toBe(200);
    expect(del.json().archived_at).not.toBeNull();

    const row = await prisma.task.findUnique({ where: { id: task.id } });
    expect(row).not.toBeNull();
  });
});
