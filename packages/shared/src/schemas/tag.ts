import { z } from 'zod';
import { UuidSchema, TimestampSchema, ColorSchema } from './common.js';
import { EntityTypeSchema } from '../enums.js';

export const TagSchema = z.object({
  id: UuidSchema,
  user_id: UuidSchema,
  name: z.string(),
  color: ColorSchema.nullable(),
  created_at: TimestampSchema,
});
export type Tag = z.infer<typeof TagSchema>;

export const TagCreateSchema = z.object({
  name: z.string().min(1).max(100),
  color: ColorSchema.nullable().optional(),
});
export type TagCreate = z.infer<typeof TagCreateSchema>;

export const TagUpdateSchema = TagCreateSchema.partial();
export type TagUpdate = z.infer<typeof TagUpdateSchema>;

// Attach / detach a tag from a polymorphic entity.
export const TagAttachSchema = z.object({
  entity_type: EntityTypeSchema,
  entity_id: UuidSchema,
});
export type TagAttach = z.infer<typeof TagAttachSchema>;

export const EntityTagSchema = z.object({
  id: UuidSchema,
  tag_id: UuidSchema,
  entity_type: EntityTypeSchema,
  entity_id: UuidSchema,
  created_at: TimestampSchema,
});
export type EntityTagRecord = z.infer<typeof EntityTagSchema>;
