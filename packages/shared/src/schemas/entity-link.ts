import { z } from 'zod';
import { UuidSchema, TimestampSchema } from './common.js';
import { EntityTypeSchema, RelationTypeSchema } from '../enums.js';

export const EntityLinkSchema = z.object({
  id: UuidSchema,
  user_id: UuidSchema,
  source_type: EntityTypeSchema,
  source_id: UuidSchema,
  target_type: EntityTypeSchema,
  target_id: UuidSchema,
  relation_type: RelationTypeSchema,
  created_at: TimestampSchema,
});
export type EntityLink = z.infer<typeof EntityLinkSchema>;

export const EntityLinkCreateSchema = z
  .object({
    source_type: EntityTypeSchema,
    source_id: UuidSchema,
    target_type: EntityTypeSchema,
    target_id: UuidSchema,
    relation_type: RelationTypeSchema.optional(),
  })
  .refine(
    (data) =>
      !(data.source_type === data.target_type && data.source_id === data.target_id),
    { message: 'Cannot link an entity to itself' },
  );
export type EntityLinkCreate = z.infer<typeof EntityLinkCreateSchema>;

// Discriminated reference union used by the polymorphic hydrator (P7).
export const EntityRefSchema = z.object({
  type: EntityTypeSchema,
  id: UuidSchema,
});
export type EntityRef = z.infer<typeof EntityRefSchema>;
