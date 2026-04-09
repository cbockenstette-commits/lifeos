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

  describe('DST boundary behavior (Risk #4)', () => {
    // Sprint date math must NOT shift at DST transitions. Using @db.Date
    // + string YYYY-MM-DD arithmetic instead of instants sidesteps this,
    // but we lock in the behavior with concrete test cases pinned at the
    // two US DST boundaries in 2026.

    it('startOfSprint is stable across the March DST start (2026-03-08)', () => {
      // 2026-03-08 (Sunday) IS the DST start in the US. Sprint beginning
      // that day is "2026-03-08"; the following Saturday is "2026-03-14".
      expect(startOfSprint('2026-03-08')).toBe('2026-03-08');
      expect(endOfSprint('2026-03-08')).toBe('2026-03-14');
      // A Wednesday in that week should snap back to the Sunday.
      expect(startOfSprint('2026-03-11')).toBe('2026-03-08');
      // A Saturday in that week should also snap back to the Sunday.
      expect(startOfSprint('2026-03-14')).toBe('2026-03-08');
    });

    it('startOfSprint is stable across the November DST end (2026-11-01)', () => {
      // 2026-11-01 (Sunday) IS the DST end in the US.
      expect(startOfSprint('2026-11-01')).toBe('2026-11-01');
      expect(endOfSprint('2026-11-01')).toBe('2026-11-07');
      expect(startOfSprint('2026-11-04')).toBe('2026-11-01');
      expect(startOfSprint('2026-11-07')).toBe('2026-11-01');
    });

    it('todayInTz returns the same calendar date on both sides of DST transitions', () => {
      // America/Boise is on MST in November, MDT in March. Same calendar
      // date should come back regardless of which side of DST we are on.
      // Early evening UTC on Sunday 2026-03-08 = Sunday afternoon local.
      expect(
        todayInTz('America/Boise', new Date('2026-03-08T20:00:00Z')),
      ).toBe('2026-03-08');
      // Early evening UTC on Sunday 2026-11-01 = Sunday afternoon local.
      expect(
        todayInTz('America/Boise', new Date('2026-11-01T20:00:00Z')),
      ).toBe('2026-11-01');
    });

    it('getOrCreateCurrentSprint creates the correct sprint on DST boundary days', async () => {
      // Pin "now" at midday UTC on the DST-start Sunday. The sprint start
      // should be exactly 2026-03-08, not 2026-03-07 or 2026-03-09.
      const fakeNow = new Date('2026-03-08T18:00:00Z');
      const sprint = await getOrCreateCurrentSprint(
        prisma,
        LOCAL_USER_ID,
        'America/Boise',
        fakeNow,
      );
      expect(sprint.start_date.toISOString().slice(0, 10)).toBe('2026-03-08');
      expect(sprint.end_date.toISOString().slice(0, 10)).toBe('2026-03-14');
    });
  });
});
