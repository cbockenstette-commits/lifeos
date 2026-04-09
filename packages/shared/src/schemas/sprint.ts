import { z } from 'zod';
import { UuidSchema, TimestampSchema, DateStringSchema } from './common.js';
import { SprintStatusSchema } from '../enums.js';

export const SprintSchema = z.object({
  id: UuidSchema,
  user_id: UuidSchema,
  start_date: DateStringSchema,
  end_date: DateStringSchema,
  status: SprintStatusSchema,
  goal: z.string().nullable(),
  created_at: TimestampSchema,
  updated_at: TimestampSchema,
});
export type Sprint = z.infer<typeof SprintSchema>;

export const SprintCreateSchema = z.object({
  start_date: DateStringSchema,
  status: SprintStatusSchema.optional(),
  goal: z.string().max(5000).nullable().optional(),
});
export type SprintCreate = z.infer<typeof SprintCreateSchema>;

export const SprintUpdateSchema = z.object({
  status: SprintStatusSchema.optional(),
  goal: z.string().max(5000).nullable().optional(),
});
export type SprintUpdate = z.infer<typeof SprintUpdateSchema>;

// ─── Pure helpers for Sunday→Saturday math (TZ-aware) ────────────────────────
//
// These run in both Node and browser. Time zones are handled by doing the
// math on a YYYY-MM-DD string in the user's TZ, which avoids JS Date's
// implicit-UTC footguns. If the input is an instant, we first convert it to
// the user's local calendar date via Intl.DateTimeFormat.

export function todayInTz(timezone: string, now: Date = new Date()): string {
  // Returns YYYY-MM-DD in the given IANA timezone.
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const year = parts.find((p) => p.type === 'year')?.value ?? '1970';
  const month = parts.find((p) => p.type === 'month')?.value ?? '01';
  const day = parts.find((p) => p.type === 'day')?.value ?? '01';
  return `${year}-${month}-${day}`;
}

function parseYmd(ymd: string): { y: number; m: number; d: number } {
  const [yStr, mStr, dStr] = ymd.split('-');
  return { y: Number(yStr), m: Number(mStr), d: Number(dStr) };
}

function ymdToUtcDate(ymd: string): Date {
  const { y, m, d } = parseYmd(ymd);
  return new Date(Date.UTC(y, m - 1, d));
}

function utcDateToYmd(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Given a YYYY-MM-DD calendar date, return the YYYY-MM-DD of the Sunday
 * on or before it. Sunday is the start of the lifeos week.
 */
export function startOfSprint(ymd: string): string {
  const date = ymdToUtcDate(ymd);
  const dow = date.getUTCDay(); // 0 = Sunday
  date.setUTCDate(date.getUTCDate() - dow);
  return utcDateToYmd(date);
}

/**
 * Given a YYYY-MM-DD start of sprint (always a Sunday), return the YYYY-MM-DD
 * of the following Saturday — the last day of the sprint.
 */
export function endOfSprint(startYmd: string): string {
  const date = ymdToUtcDate(startYmd);
  date.setUTCDate(date.getUTCDate() + 6);
  return utcDateToYmd(date);
}
