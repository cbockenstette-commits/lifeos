import { z } from 'zod';
import {
  UuidSchema,
  TimestampSchema,
  NullableTimestampSchema,
} from './common.js';
import { ResourceKindSchema } from '../enums.js';

export const ResourceSchema = z.object({
  id: UuidSchema,
  user_id: UuidSchema,
  area_id: UuidSchema.nullable(),
  title: z.string(),
  url: z.string().nullable(),
  body_md: z.string().nullable(),
  source_kind: ResourceKindSchema,
  archived_at: NullableTimestampSchema,
  created_at: TimestampSchema,
  updated_at: TimestampSchema,
});
export type Resource = z.infer<typeof ResourceSchema>;

export const ResourceCreateSchema = z.object({
  title: z.string().min(1).max(500),
  url: z.string().url().nullable().optional(),
  body_md: z.string().max(100000).nullable().optional(),
  source_kind: ResourceKindSchema.optional(),
  area_id: UuidSchema.nullable().optional(),
});
export type ResourceCreate = z.infer<typeof ResourceCreateSchema>;

export const ResourceUpdateSchema = ResourceCreateSchema.partial();
export type ResourceUpdate = z.infer<typeof ResourceUpdateSchema>;
