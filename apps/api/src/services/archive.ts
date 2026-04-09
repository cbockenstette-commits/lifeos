// ADR-3: archive = nullable archived_at timestamp filtered at the route layer.
//
// Every list endpoint calls applyArchivedFilter(where, query) before issuing
// its Prisma findMany. The default behavior hides archived rows; passing
// ?includeArchived=true opts out.

import type { ListQuery } from '@lifeos/shared';

export function applyArchivedFilter<T extends Record<string, unknown>>(
  where: T,
  query: Pick<ListQuery, 'includeArchived'>,
): T & { archived_at?: null } {
  if (query.includeArchived) {
    return where;
  }
  return { ...where, archived_at: null };
}

export async function archiveRecord<T>(
  find: () => Promise<T | null>,
  update: (archived_at: Date) => Promise<T>,
): Promise<T> {
  const existing = await find();
  if (!existing) {
    const err = new Error('Record not found');
    (err as Error & { statusCode?: number }).statusCode = 404;
    throw err;
  }
  return update(new Date());
}
