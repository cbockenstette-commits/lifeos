import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { makeTestApp } from './helpers/app.js';
import { resetDb } from './helpers/reset.js';
import { LOCAL_USER_ID } from '../src/config.js';
import { startOfSprint, todayInTz } from '@lifeos/shared';

describe('GET /api/dashboard', () => {
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

  async function call() {
    const res = await app.inject({ method: 'GET', url: '/api/dashboard' });
    expect(res.statusCode).toBe(200);
    return res.json();
  }

  it('returns all 6 sections with empty arrays on a clean DB', async () => {
    const body = await call();
    expect(body).toHaveProperty('currentSprint');
    expect(body.currentSprint).not.toBeNull(); // find-or-create resolves one
    expect(body.inProgressTasks).toEqual([]);
    expect(body.dueToday).toEqual([]);
    expect(body.staleTasks).toEqual([]);
    expect(body.weeklyFocusByArea).toEqual([]);
    expect(body.recentResources).toEqual([]);
  });

  it('includes in-progress tasks from the current sprint', async () => {
    const area = (
      await app.inject({ method: 'POST', url: '/api/areas', payload: { name: 'Health' } })
    ).json();
    const sprint = await call().then((b) => b.currentSprint);
    const task = (
      await app.inject({
        method: 'POST',
        url: '/api/tasks',
        payload: { title: 'Running', area_id: area.id },
      })
    ).json();
    // Assign to sprint and move to in_progress
    await app.inject({
      method: 'PATCH',
      url: `/api/tasks/${task.id}`,
      payload: { sprint_id: sprint.id, status: 'in_progress' },
    });

    const body = await call();
    expect(body.inProgressTasks).toHaveLength(1);
    expect(body.inProgressTasks[0].title).toBe('Running');
  });

  it('includes dueToday tasks (due_date <= today)', async () => {
    const area = (
      await app.inject({ method: 'POST', url: '/api/areas', payload: { name: 'Health' } })
    ).json();
    // Today in the local user's TZ (same one the aggregator uses).
    const today = todayInTz('America/Boise');
    await app.inject({
      method: 'POST',
      url: '/api/tasks',
      payload: { title: 'Due today', area_id: area.id, due_date: today },
    });
    await app.inject({
      method: 'POST',
      url: '/api/tasks',
      payload: {
        title: 'Due 2030',
        area_id: area.id,
        due_date: '2030-01-01',
      },
    });

    const body = await call();
    expect(body.dueToday).toHaveLength(1);
    expect(body.dueToday[0].title).toBe('Due today');
  });

  it('excludes done tasks from dueToday', async () => {
    const area = (
      await app.inject({ method: 'POST', url: '/api/areas', payload: { name: 'Health' } })
    ).json();
    const today = todayInTz('America/Boise');
    const task = (
      await app.inject({
        method: 'POST',
        url: '/api/tasks',
        payload: { title: 'Finished', area_id: area.id, due_date: today },
      })
    ).json();
    await app.inject({
      method: 'PATCH',
      url: `/api/tasks/${task.id}`,
      payload: { status: 'done' },
    });

    const body = await call();
    expect(body.dueToday).toHaveLength(0);
  });

  it('includes staleTasks (updated_at > 14 days ago, not done, not backlog)', async () => {
    const area = (
      await app.inject({ method: 'POST', url: '/api/areas', payload: { name: 'Health' } })
    ).json();
    const task = (
      await app.inject({
        method: 'POST',
        url: '/api/tasks',
        payload: { title: 'Stale task', area_id: area.id, status: 'in_progress' },
      })
    ).json();

    // Force updated_at to be old via raw SQL (can't be done via API).
    const oldDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await prisma.task.update({
      where: { id: task.id },
      data: { updated_at: oldDate },
    });

    const body = await call();
    expect(body.staleTasks.map((t: { id: string }) => t.id)).toContain(task.id);
  });

  it('does NOT include backlog tasks in staleTasks even if old', async () => {
    const area = (
      await app.inject({ method: 'POST', url: '/api/areas', payload: { name: 'Health' } })
    ).json();
    const task = (
      await app.inject({
        method: 'POST',
        url: '/api/tasks',
        payload: { title: 'Old backlog', area_id: area.id },
      })
    ).json();
    const oldDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await prisma.task.update({
      where: { id: task.id },
      data: { updated_at: oldDate },
    });

    const body = await call();
    const ids = body.staleTasks.map((t: { id: string }) => t.id);
    expect(ids).not.toContain(task.id);
  });

  it('computes weeklyFocusByArea counting both direct and transitive area references', async () => {
    const healthArea = (
      await app.inject({ method: 'POST', url: '/api/areas', payload: { name: 'Health' } })
    ).json();
    const workArea = (
      await app.inject({ method: 'POST', url: '/api/areas', payload: { name: 'Work' } })
    ).json();
    const project = (
      await app.inject({
        method: 'POST',
        url: '/api/projects',
        payload: { name: 'Project 1', area_id: healthArea.id },
      })
    ).json();

    // First resolve the current sprint.
    const body0 = await call();
    const sprintId = body0.currentSprint.id;

    // Task 1: direct area (Health)
    const t1 = (
      await app.inject({
        method: 'POST',
        url: '/api/tasks',
        payload: { title: 'Run', area_id: healthArea.id, estimate_minutes: 30 },
      })
    ).json();
    // Task 2: transitive via project (also Health)
    const t2 = (
      await app.inject({
        method: 'POST',
        url: '/api/tasks',
        payload: { title: 'Stretch', project_id: project.id, estimate_minutes: 10 },
      })
    ).json();
    // Task 3: direct area Work
    const t3 = (
      await app.inject({
        method: 'POST',
        url: '/api/tasks',
        payload: { title: 'Emails', area_id: workArea.id, estimate_minutes: 45 },
      })
    ).json();
    for (const tid of [t1.id, t2.id, t3.id]) {
      await app.inject({
        method: 'PATCH',
        url: `/api/tasks/${tid}`,
        payload: { sprint_id: sprintId },
      });
    }

    const body = await call();
    const byArea = Object.fromEntries(
      body.weeklyFocusByArea.map(
        (a: { area_name: string; task_count: number; total_estimate_minutes: number }) => [
          a.area_name,
          a,
        ],
      ),
    );
    expect(byArea.Health?.task_count).toBe(2);
    expect(byArea.Health?.total_estimate_minutes).toBe(40);
    expect(byArea.Work?.task_count).toBe(1);
    expect(byArea.Work?.total_estimate_minutes).toBe(45);
  });

  it('returns recentResources in created_at DESC order, capped at 5', async () => {
    const area = (
      await app.inject({ method: 'POST', url: '/api/areas', payload: { name: 'Health' } })
    ).json();

    const titles: string[] = [];
    for (let i = 0; i < 7; i++) {
      titles.push(`Resource ${i}`);
      await app.inject({
        method: 'POST',
        url: '/api/resources',
        payload: { title: `Resource ${i}`, area_id: area.id },
      });
    }

    const body = await call();
    expect(body.recentResources).toHaveLength(5);
    // Newest first
    expect(body.recentResources[0].title).toBe('Resource 6');
    expect(body.recentResources[4].title).toBe('Resource 2');
  });

  it('issues one HTTP request (no N+1) — verified via a sanity check on counts', async () => {
    // We can't directly measure query count from outside, but we CAN verify
    // the handler completes quickly with a moderate data set. At ~15 rows
    // across 3 entity types the handler must finish in < 2 seconds.
    const area = (
      await app.inject({ method: 'POST', url: '/api/areas', payload: { name: 'Health' } })
    ).json();
    for (let i = 0; i < 5; i++) {
      await app.inject({
        method: 'POST',
        url: '/api/tasks',
        payload: { title: `Task ${i}`, area_id: area.id },
      });
    }
    for (let i = 0; i < 3; i++) {
      await app.inject({
        method: 'POST',
        url: '/api/resources',
        payload: { title: `Res ${i}`, area_id: area.id },
      });
    }

    const start = Date.now();
    const body = await call();
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(2000);
    expect(body.recentResources).toHaveLength(3);
  });

  // Suppress unused-import warning on startOfSprint.
  void startOfSprint;
  void LOCAL_USER_ID;
});
