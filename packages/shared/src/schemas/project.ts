import { z } from 'zod';
import {
  UuidSchema,
  TimestampSchema,
  NullableTimestampSchema,
  DateStringSchema,
} from './common.js';
import { ProjectStatusSchema } from '../enums.js';

export const ProjectSchema = z.object({
  id: UuidSchema,
  user_id: UuidSchema,
  area_id: UuidSchema.nullable(),
  parent_id: UuidSchema.nullable(),
  name: z.string(),
  description: z.string().nullable(),
  status: ProjectStatusSchema,
  target_date: DateStringSchema.nullable(),
  priority_score: z.number(),
  archived_at: NullableTimestampSchema,
  completed_at: NullableTimestampSchema,
  created_at: TimestampSchema,
  updated_at: TimestampSchema,
});
export type Project = z.infer<typeof ProjectSchema>;

export const ProjectCreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(10000).nullable().optional(),
  area_id: UuidSchema.nullable().optional(),
  parent_id: UuidSchema.nullable().optional(),
  status: ProjectStatusSchema.optional(),
  target_date: DateStringSchema.nullable().optional(),
  priority_score: z.number().optional(),
});
export type ProjectCreate = z.infer<typeof ProjectCreateSchema>;

export const ProjectUpdateSchema = ProjectCreateSchema.partial().extend({
  completed_at: NullableTimestampSchema.optional(),
});
export type ProjectUpdate = z.infer<typeof ProjectUpdateSchema>;
