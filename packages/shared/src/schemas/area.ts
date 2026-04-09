import { z } from 'zod';
import {
  UuidSchema,
  TimestampSchema,
  NullableTimestampSchema,
  ColorSchema,
} from './common.js';

export const AreaSchema = z.object({
  id: UuidSchema,
  user_id: UuidSchema,
  name: z.string(),
  description: z.string().nullable(),
  color: ColorSchema.nullable(),
  archived_at: NullableTimestampSchema,
  created_at: TimestampSchema,
  updated_at: TimestampSchema,
});
export type Area = z.infer<typeof AreaSchema>;

export const AreaCreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(5000).nullable().optional(),
  color: ColorSchema.nullable().optional(),
});
export type AreaCreate = z.infer<typeof AreaCreateSchema>;

export const AreaUpdateSchema = AreaCreateSchema.partial();
export type AreaUpdate = z.infer<typeof AreaUpdateSchema>;
