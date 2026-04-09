// P7: polymorphic entity hydrator.
//
// Given a list of EntityRef values ({ type, id }), fetches the matching
// row from each entity's table in a SINGLE findMany per distinct type
// (never N queries for N refs). Returns a compact "display card" shape
// with just the fields we need: id, title, type, archived_at, and any
// type-specific secondary field (status/source_kind/color).
//
// Default behavior filters out archived entities from the hydrated
// result so backlinks and tag listings show active items only.
// `includeArchived=true` opts out and reveals them.

import type { PrismaClient } from '@prisma/client';
import type { EntityType } from '@lifeos/shared';

export interface HydratedEntity {
  type: EntityType;
  id: string;
  title: string;
  archived_at: string | null;
  // Type-specific secondary info for display.
  secondary: string | null;
  color: string | null;
}

export interface HydrateOptions {
  includeArchived?: boolean;
}

function archivedWhere(includeArchived: boolean | undefined) {
  return includeArchived ? {} : { archived_at: null };
}

export async function hydrateEntities(
  prisma: PrismaClient,
  userId: string,
  refs: Array<{ type: EntityType; id: string }>,
  options: HydrateOptions = {},
): Promise<HydratedEntity[]> {
  if (refs.length === 0) return [];

  // Group by type so we can issue one query per distinct type.
  const byType = new Map<EntityType, string[]>();
  for (const ref of refs) {
    const ids = byType.get(ref.type) ?? [];
    ids.push(ref.id);
    byType.set(ref.type, ids);
  }

  const hydrated: HydratedEntity[] = [];

  // Run all type-scoped queries in parallel.
  const results = await Promise.all(
    Array.from(byType.entries()).map(async ([type, ids]) => {
      switch (type) {
        case 'area': {
          const rows = await prisma.area.findMany({
            where: { user_id: userId, id: { in: ids }, ...archivedWhere(options.includeArchived) },
            select: { id: true, name: true, color: true, archived_at: true },
          });
          return rows.map((r) => ({
            type: 'area' as const,
            id: r.id,
            title: r.name,
            archived_at: r.archived_at ? r.archived_at.toISOString() : null,
            secondary: null,
            color: r.color,
          }));
        }
        case 'project': {
          const rows = await prisma.project.findMany({
            where: { user_id: userId, id: { in: ids }, ...archivedWhere(options.includeArchived) },
            select: {
              id: true,
              name: true,
              status: true,
              archived_at: true,
            },
          });
          return rows.map((r) => ({
            type: 'project' as const,
            id: r.id,
            title: r.name,
            archived_at: r.archived_at ? r.archived_at.toISOString() : null,
            secondary: r.status,
            color: null,
          }));
        }
        case 'task': {
          const rows = await prisma.task.findMany({
            where: { user_id: userId, id: { in: ids }, ...archivedWhere(options.includeArchived) },
            select: {
              id: true,
              title: true,
              status: true,
              archived_at: true,
            },
          });
          return rows.map((r) => ({
            type: 'task' as const,
            id: r.id,
            title: r.title,
            archived_at: r.archived_at ? r.archived_at.toISOString() : null,
            secondary: r.status,
            color: null,
          }));
        }
        case 'resource': {
          const rows = await prisma.resource.findMany({
            where: { user_id: userId, id: { in: ids }, ...archivedWhere(options.includeArchived) },
            select: {
              id: true,
              title: true,
              source_kind: true,
              archived_at: true,
            },
          });
          return rows.map((r) => ({
            type: 'resource' as const,
            id: r.id,
            title: r.title,
            archived_at: r.archived_at ? r.archived_at.toISOString() : null,
            secondary: r.source_kind,
            color: null,
          }));
        }
      }
    }),
  );

  for (const chunk of results) {
    hydrated.push(...chunk);
  }

  return hydrated;
}
