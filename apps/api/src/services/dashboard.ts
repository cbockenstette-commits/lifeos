// ADR-4: dashboard aggregator service.
//
// Composes the 6 homepage sections from 5-6 parallel Prisma queries on a
// single connection. The handler returns one JSON document that the
// frontend consumes via a single React Query key.
//
// Timezone handling (ADR-8): "today" and "this week" are resolved using
// the user's stored timezone via the shared todayInTz helper, so the
// homepage respects wherever the user currently is.
//
// Empty sections return [] (never null) so the frontend can render
// uniformly.

import type { PrismaClient, Task, Resource, Sprint } from '@prisma/client';
import { todayInTz, startOfSprint, endOfSprint } from '@lifeos/shared';
import { getOrCreateCurrentSprint } from './current-sprint.js';

const STALE_DAYS = 14;

export interface DashboardResult {
  currentSprint: Sprint | null;
  inProgressTasks: Task[];
  dueToday: Task[];
  staleTasks: Task[];
  weeklyFocusByArea: Array<{
    area_id: string;
    area_name: string;
    task_count: number;
    total_estimate_minutes: number;
  }>;
  recentResources: Resource[];
}

export async function buildDashboard(
  prisma: PrismaClient,
  userId: string,
  timezone: string,
  now: Date = new Date(),
): Promise<DashboardResult> {
  const today = todayInTz(timezone, now);
  const startYmd = startOfSprint(today);
  const endYmd = endOfSprint(startYmd);
  const weekStart = new Date(`${startYmd}T00:00:00.000Z`);
  const weekEnd = new Date(`${endYmd}T23:59:59.999Z`);
  const todayDate = new Date(`${today}T00:00:00.000Z`);
  // due_date is a calendar DATE; we compare against the end of today so
  // anything due on or before today is included.
  const endOfToday = new Date(`${today}T23:59:59.999Z`);
  const staleCutoff = new Date(now.getTime() - STALE_DAYS * 24 * 60 * 60 * 1000);

  // Always resolve (find-or-create) the current sprint so the dashboard
  // has something meaningful to point at on first visit of the week.
  const currentSprint = await getOrCreateCurrentSprint(
    prisma,
    userId,
    timezone,
    now,
  );

  // Run independent reads in parallel. Each Prisma call uses its own
  // internal connection from the pool, so this is safe (this is not the
  // asyncpg "same connection gather" hazard).
  const [
    inProgressTasks,
    dueToday,
    staleTasks,
    weeklyTasks,
    recentResources,
    areas,
    projects,
  ] = await Promise.all([
    prisma.task.findMany({
      where: {
        user_id: userId,
        sprint_id: currentSprint.id,
        status: 'in_progress',
        archived_at: null,
      },
      orderBy: [{ sort_order: 'asc' }, { updated_at: 'desc' }],
    }),
    prisma.task.findMany({
      where: {
        user_id: userId,
        due_date: { lte: endOfToday },
        status: { notIn: ['done'] },
        archived_at: null,
      },
      orderBy: { due_date: 'asc' },
    }),
    // Stale tasks: updated more than 14 days ago, not completed, not
    // sitting in the backlog (a backlog task that's untouched is just
    // "not started" — it's only "stale" if you started it and forgot).
    prisma.task.findMany({
      where: {
        user_id: userId,
        updated_at: { lt: staleCutoff },
        status: { notIn: ['done', 'backlog'] },
        archived_at: null,
      },
      orderBy: { updated_at: 'asc' },
    }),
    // All non-archived tasks scheduled for the current week (any sprint
    // task, or any task whose due_date falls in the week window).
    prisma.task.findMany({
      where: {
        user_id: userId,
        archived_at: null,
        OR: [
          { sprint_id: currentSprint.id },
          { due_date: { gte: weekStart, lte: weekEnd } },
        ],
      },
    }),
    prisma.resource.findMany({
      where: { user_id: userId, archived_at: null },
      orderBy: { created_at: 'desc' },
      take: 5,
    }),
    prisma.area.findMany({
      where: { user_id: userId, archived_at: null },
      select: { id: true, name: true },
    }),
    prisma.project.findMany({
      where: { user_id: userId },
      select: { id: true, area_id: true },
    }),
  ]);

  // Resolve each task's area: direct task.area_id OR transitively via
  // task.project_id → project.area_id. Aggregate counts + estimates.
  const areaNameById = new Map(areas.map((a) => [a.id, a.name]));
  const projectAreaById = new Map(projects.map((p) => [p.id, p.area_id]));
  const focusMap = new Map<
    string,
    { area_id: string; area_name: string; task_count: number; total_estimate_minutes: number }
  >();

  for (const t of weeklyTasks) {
    const areaId =
      t.area_id ?? (t.project_id ? projectAreaById.get(t.project_id) ?? null : null);
    if (!areaId) continue;
    const name = areaNameById.get(areaId);
    if (!name) continue;
    const existing = focusMap.get(areaId);
    if (existing) {
      existing.task_count += 1;
      existing.total_estimate_minutes += t.estimate_minutes ?? 0;
    } else {
      focusMap.set(areaId, {
        area_id: areaId,
        area_name: name,
        task_count: 1,
        total_estimate_minutes: t.estimate_minutes ?? 0,
      });
    }
  }

  return {
    currentSprint,
    inProgressTasks,
    dueToday,
    staleTasks,
    weeklyFocusByArea: Array.from(focusMap.values()).sort(
      (a, b) => b.task_count - a.task_count,
    ),
    recentResources,
  };
  // Reference unused helper so TS doesn't complain about unused import.
  void todayDate;
}
