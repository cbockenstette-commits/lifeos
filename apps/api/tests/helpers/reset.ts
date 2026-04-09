import type { PrismaClient } from '@prisma/client';
import {
  LOCAL_USER_ID,
  LOCAL_USER_EMAIL,
  LOCAL_USER_NAME,
  DEFAULT_TIMEZONE,
} from '../../src/config.js';

// TRUNCATE every table in one statement, then re-seed the local user.
// CASCADE handles FK chains. RESTART IDENTITY resets any sequences
// (we don't use them but keep the habit).
//
// Order matters when CASCADE is NOT used; with CASCADE, order doesn't
// matter but we list leaves first as documentation.

const TABLES = [
  'EntityLink',
  'EntityTag',
  'Tag',
  'Task',
  'Sprint',
  'Project',
  'Resource',
  'Area',
  'User',
] as const;

export async function resetDb(prisma: PrismaClient): Promise<void> {
  const quoted = TABLES.map((t) => `"${t}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE;`);
  await prisma.user.create({
    data: {
      id: LOCAL_USER_ID,
      email: LOCAL_USER_EMAIL,
      name: LOCAL_USER_NAME,
      timezone: DEFAULT_TIMEZONE,
    },
  });
}
