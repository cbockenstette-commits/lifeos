import { z } from 'zod';

// Shared primitive validators reused across entity schemas.

export const UuidSchema = z.string().uuid();

// Used for Prisma @db.Date columns.
//
// Prisma returns Date objects for date columns (time set to midnight UTC).
// JSON.stringify converts them to ISO strings automatically. Clients can
// parse with new Date() or with the same zod schema. We deliberately do
// NOT apply a .transform() here — doing so would cause fastify-type-
// provider-zod to expect a string return type from route handlers, which
// mismatches Prisma's Date return type. Accepting both is the pragmatic
// middle ground.
export const DateStringSchema = z.union([z.string(), z.date()]);

// Used for Prisma @db.Timestamptz columns. Same pattern as DateStringSchema.
export const TimestampSchema = z.union([z.string(), z.date()]);

// Nullable timestamp column (for archived_at, completed_at, etc.).
export const NullableTimestampSchema = TimestampSchema.nullable();

// IANA timezone validator. Uses the browser-native Intl.DateTimeFormat
// to validate — if Node.js can construct a DateTimeFormat with this zone,
// it's a valid IANA identifier.
export const TimezoneSchema = z.string().refine(
  (tz) => {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  },
  { message: 'Invalid IANA timezone' },
);

// Short color string (hex-ish). Not strict; just caps length so the DB
// doesn't receive arbitrary blobs.
export const ColorSchema = z.string().min(1).max(32);

// Eisenhower 0..3 integer.
export const EisenhowerScoreSchema = z.number().int().min(0).max(3);

// Pagination / filter query params shared by list endpoints.
export const ListQuerySchema = z.object({
  includeArchived: z
    .union([z.literal('true'), z.literal('false'), z.boolean()])
    .optional()
    .transform((v) => v === true || v === 'true'),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
});
export type ListQuery = z.infer<typeof ListQuerySchema>;
