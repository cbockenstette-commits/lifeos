import { z } from 'zod';
import { UuidSchema, NullableTimestampSchema } from './common.js';
import { EntityTypeSchema, RelationTypeSchema } from '../enums.js';

// Minimal display shape returned by the backend hydrator for polymorphic
// entity references. One unified shape across all 4 entity types so the
// frontend can render any kind of reference with a single component.

export const HydratedEntitySchema = z.object({
  type: EntityTypeSchema,
  id: UuidSchema,
  title: z.string(),
  archived_at: NullableTimestampSchema,
  secondary: z.string().nullable(),
  color: z.string().nullable(),
});
export type HydratedEntity = z.infer<typeof HydratedEntitySchema>;

// Response shape for GET /api/tags/:id/entities — hydrated entities
// grouped by type so the tag detail page can render sections.
export const TagEntitiesSchema = z.object({
  area: z.array(HydratedEntitySchema),
  project: z.array(HydratedEntitySchema),
  task: z.array(HydratedEntitySchema),
  resource: z.array(HydratedEntitySchema),
});
export type TagEntities = z.infer<typeof TagEntitiesSchema>;

// Response shape for GET /api/entity-links/hydrated. Each edge carries
// the original link metadata plus the hydrated "other end" entity so
// the backlinks panel can render without a second round-trip.
export const HydratedLinkEdgeSchema = z.object({
  link_id: UuidSchema,
  relation_type: RelationTypeSchema,
  other: HydratedEntitySchema,
});
export type HydratedLinkEdge = z.infer<typeof HydratedLinkEdgeSchema>;

export const HydratedLinksSchema = z.object({
  outgoing: z.array(HydratedLinkEdgeSchema),
  incoming: z.array(HydratedLinkEdgeSchema),
});
export type HydratedLinks = z.infer<typeof HydratedLinksSchema>;
