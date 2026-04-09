import { z } from 'zod';
import { UuidSchema } from './common.js';
import { SprintSchema } from './sprint.js';
import { TaskSchema } from './task.js';
import { ResourceSchema } from './resource.js';

// ADR-4: single /api/dashboard aggregator endpoint.
//
// One HTTP round-trip, one React Query key, one cache invalidation path.
// Every widget section MUST return an empty array (never null) when no
// data exists so the frontend can render uniformly.

export const AreaFocusSchema = z.object({
  area_id: UuidSchema,
  area_name: z.string(),
  task_count: z.number().int(),
  total_estimate_minutes: z.number().int(),
});
export type AreaFocus = z.infer<typeof AreaFocusSchema>;

export const DashboardSchema = z.object({
  currentSprint: SprintSchema.nullable(),
  inProgressTasks: z.array(TaskSchema),
  dueToday: z.array(TaskSchema),
  staleTasks: z.array(TaskSchema),
  weeklyFocusByArea: z.array(AreaFocusSchema),
  recentResources: z.array(ResourceSchema),
});
export type Dashboard = z.infer<typeof DashboardSchema>;
