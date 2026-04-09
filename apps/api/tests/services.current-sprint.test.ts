import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { getOrCreateCurrentSprint } from '../src/services/current-sprint.js';
import { resetDb } from './helpers/reset.js';
import { LOCAL_USER_ID } from '../src/config.js';
import { startOfSprint, endOfSprint, todayInTz } from '@lifeos/shared';

describe('getOrCreateCurrentSprint', () => {
  const prisma = new PrismaClient();

  beforeAll(async () => {
    await prisma.$connect();
  });

  beforeEach(async () => {
    await resetDb(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates a sprint when none exists for today', async () => {
    const sprint = await getOrCreateCurrentSprint(
      prisma,
      LOCAL_USER_ID,
      'America/Boise',
    );
    expect(sprint.user_id).toBe(LOCAL_USER_ID);
    expect(sprint.status).toBe('planned');
    expect(sprint.start_date.getUTCDay()).toBe(0); // Sunday
    expect(sprint.end_date.getUTCDay()).toBe(6); // Saturday
  });

  it('returns the same sprint on repeated calls (idempotent)', async () => {
    const first = await getOrCreateCurrentSprint(
      prisma,
      LOCAL_USER_ID,
      'America/Boise',
    );
    const second = await getOrCreateCurrentSprint(
      prisma,
      LOCAL_USER_ID,
      'America/Boise',
    );
    expect(second.id).toBe(first.id);
    const count = await prisma.sprint.count();
    expect(count).toBe(1);
  });

  it('computes the Sunday-of-week correctly via the shared helper', () => {
    // 2026-04-08 is a Wednesday; Sunday of that week is 2026-04-05.
    expect(startOfSprint('2026-04-08')).toBe('2026-04-05');
    expect(endOfSprint('2026-04-05')).toBe('2026-04-11');
  });

  it('todayInTz returns YYYY-MM-DD', () => {
    const today = todayInTz('America/Boise', new Date('2026-04-08T19:00:00Z'));
    // Idaho is UTC-6 (MDT after DST), so 2026-04-08 19:00 UTC = 13:00 local = same day
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(today).toBe('2026-04-08');
  });
});
