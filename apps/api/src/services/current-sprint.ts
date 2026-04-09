// ADR-8: find-or-create sprint containing today (in the user's timezone).
//
// GET /api/sprints/current uses this. Idempotent: calling it twice for the
// same (user, today-in-tz) never creates a duplicate. Backed by the
// UNIQUE(user_id, start_date) constraint — even on a race, Postgres rejects
// the second insert and we fall back to the existing row.

import type { PrismaClient, Sprint } from '@prisma/client';
import { startOfSprint, endOfSprint, todayInTz } from '../lib/week.js';

export async function getOrCreateCurrentSprint(
  prisma: PrismaClient,
  userId: string,
  timezone: string,
  now: Date = new Date(),
): Promise<Sprint> {
  const today = todayInTz(timezone, now);
  const startYmd = startOfSprint(today);
  const endYmd = endOfSprint(startYmd);
  const start_date = new Date(`${startYmd}T00:00:00.000Z`);
  const end_date = new Date(`${endYmd}T00:00:00.000Z`);

  const existing = await prisma.sprint.findUnique({
    where: { user_id_start_date: { user_id: userId, start_date } },
  });
  if (existing) return existing;

  try {
    return await prisma.sprint.create({
      data: {
        user_id: userId,
        start_date,
        end_date,
        status: 'planned',
      },
    });
  } catch (err) {
    // Race: another request created it between our find and create.
    // Fetch it again; if still missing, rethrow.
    const winner = await prisma.sprint.findUnique({
      where: { user_id_start_date: { user_id: userId, start_date } },
    });
    if (winner) return winner;
    throw err;
  }
}
