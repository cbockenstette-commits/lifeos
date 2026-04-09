import { z } from 'zod';
import {
  UuidSchema,
  TimestampSchema,
  NullableTimestampSchema,
  DateStringSchema,
  EisenhowerScoreSchema,
} from './common.js';
import { TaskStatusSchema } from '../enums.js';

export const TaskSchema = z.object({
  id: UuidSchema,
  user_id: UuidSchema,
  project_id: UuidSchema.nullable(),
  area_id: UuidSchema.nullable(),
  parent_id: UuidSchema.nullable(),
  sprint_id: UuidSchema.nullable(),
  title: z.string(),
  description: z.string().nullable(),
  status: TaskStatusSchema,
  urgency: EisenhowerScoreSchema,
  importance: EisenhowerScoreSchema,
  estimate_minutes: z.number().int().nullable(),
  due_date: DateStringSchema.nullable(),
  priority_score: z.number(),
  sort_order: z.number().int(),
  archived_at: NullableTimestampSchema,
  completed_at: NullableTimestampSchema,
  created_at: TimestampSchema,
  updated_at: TimestampSchema,
});
export type Task = z.infer<typeof TaskSchema>;

// Task parent XOR: exactly one of project_id or area_id must be set.
// Enforced by a raw SQL CHECK constraint (task_parent_xor) AND here in Zod
// so clients get a clean 422 instead of a Postgres error.
const TaskParentXor = (
  data: { project_id?: string | null; area_id?: string | null },
) => {
  const hasProject = data.project_id != null;
  const hasArea = data.area_id != null;
  return hasProject !== hasArea; // true XOR
};

const TaskParentXorMessage =
  'Task must belong to exactly one of project_id or area_id';

export const TaskCreateSchema = z
  .object({
    title: z.string().min(1).max(500),
    description: z.string().max(10000).nullable().optional(),
    project_id: UuidSchema.nullable().optional(),
    area_id: UuidSchema.nullable().optional(),
    parent_id: UuidSchema.nullable().optional(),
    sprint_id: UuidSchema.nullable().optional(),
    status: TaskStatusSchema.optional(),
    urgency: EisenhowerScoreSchema.optional(),
    importance: EisenhowerScoreSchema.optional(),
    estimate_minutes: z.number().int().min(0).nullable().optional(),
    due_date: DateStringSchema.nullable().optional(),
    priority_score: z.number().optional(),
    sort_order: z.number().int().optional(),
  })
  .refine(TaskParentXor, { message: TaskParentXorMessage });
export type TaskCreate = z.infer<typeof TaskCreateSchema>;

// For updates the XOR rule is optional — if neither project_id nor area_id is
// present in the patch, we don't check (the existing row stays valid). If
// either is present, we require the final state to satisfy XOR. That final
// check happens in the route handler after merging with the current row.
export const TaskUpdateSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(10000).nullable().optional(),
  project_id: UuidSchema.nullable().optional(),
  area_id: UuidSchema.nullable().optional(),
  parent_id: UuidSchema.nullable().optional(),
  sprint_id: UuidSchema.nullable().optional(),
  status: TaskStatusSchema.optional(),
  urgency: EisenhowerScoreSchema.optional(),
  importance: EisenhowerScoreSchema.optional(),
  estimate_minutes: z.number().int().min(0).nullable().optional(),
  due_date: DateStringSchema.nullable().optional(),
  priority_score: z.number().optional(),
  sort_order: z.number().int().optional(),
  completed_at: NullableTimestampSchema.optional(),
});
export type TaskUpdate = z.infer<typeof TaskUpdateSchema>;

// Helper for the route layer — re-check XOR after merging patch into row.
export function validateTaskParentXor(
  current: { project_id: string | null; area_id: string | null },
  patch: { project_id?: string | null; area_id?: string | null },
): boolean {
  const next = {
    project_id: 'project_id' in patch ? patch.project_id : current.project_id,
    area_id: 'area_id' in patch ? patch.area_id : current.area_id,
  };
  return (next.project_id != null) !== (next.area_id != null);
}

export { TaskParentXorMessage };
