// ADR-1: polymorphic entity_links + entity_tags.
//
// Because Prisma cannot enforce foreign keys on the polymorphic (source|target)
// columns, we enforce integrity in application code on the create path. Every
// POST /api/entity-links (and POST /api/tags/:id/attach) calls
// assertEntityExists(type, id) for each side. Rejects with 404 if the record
// is missing, or is not owned by the given user.
//
// Entity lifecycle contract: archive-only, no hard delete in v1. That means
// once a link is created, it cannot become an orphan via a normal API path.
// integrity.test.ts (P7) catches regressions from manual SQL tampering.

import type { PrismaClient } from '@prisma/client';
import type { EntityType } from '@lifeos/shared';

export async function assertEntityExists(
  prisma: PrismaClient,
  userId: string,
  type: EntityType,
  id: string,
): Promise<void> {
  let exists = false;
  switch (type) {
    case 'area': {
      const row = await prisma.area.findFirst({
        where: { id, user_id: userId },
        select: { id: true },
      });
      exists = row !== null;
      break;
    }
    case 'project': {
      const row = await prisma.project.findFirst({
        where: { id, user_id: userId },
        select: { id: true },
      });
      exists = row !== null;
      break;
    }
    case 'task': {
      const row = await prisma.task.findFirst({
        where: { id, user_id: userId },
        select: { id: true },
      });
      exists = row !== null;
      break;
    }
    case 'resource': {
      const row = await prisma.resource.findFirst({
        where: { id, user_id: userId },
        select: { id: true },
      });
      exists = row !== null;
      break;
    }
  }
  if (!exists) {
    const err = new Error(`${type} ${id} not found`);
    (err as Error & { statusCode?: number }).statusCode = 404;
    throw err;
  }
}
