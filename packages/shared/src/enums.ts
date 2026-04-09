import { z } from 'zod';

// These MUST match the Prisma enums in apps/api/prisma/schema.prisma.
// schema-parity.test.ts asserts equality of the enum value sets.

export const TaskStatusSchema = z.enum([
  'backlog',
  'todo',
  'in_progress',
  'review',
  'done',
]);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const SprintStatusSchema = z.enum(['planned', 'active', 'complete']);
export type SprintStatus = z.infer<typeof SprintStatusSchema>;

export const ProjectStatusSchema = z.enum([
  'not_started',
  'active',
  'blocked',
  'complete',
]);
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;

// Sprint is intentionally excluded — sprints are ephemeral weekly containers,
// not objects to link or tag in v1. See ADR-1/ADR-2 in agent/next_task.md.
export const EntityTypeSchema = z.enum(['area', 'project', 'task', 'resource']);
export type EntityType = z.infer<typeof EntityTypeSchema>;

export const ResourceKindSchema = z.enum(['note', 'url', 'clipping']);
export type ResourceKind = z.infer<typeof ResourceKindSchema>;

// EntityLink.relation_type whitelist (matches DB CHECK constraint).
// parent_of intentionally absent — Project/Task hierarchy uses native parent_id.
export const RelationTypeSchema = z.enum(['references', 'blocks', 'depends_on']);
export type RelationType = z.infer<typeof RelationTypeSchema>;
