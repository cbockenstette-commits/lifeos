// Date coercion at the Prisma boundary.
//
// Zod's DateStringSchema accepts either a string or a Date (no
// transform, so the output type stays permissive — see common.ts).
// But Prisma's @db.Date and @db.Timestamptz columns only accept Date
// objects at write time, not raw ISO strings. We convert at the route
// layer before calling prisma.create/update.
//
// Empty strings are treated as null so that an empty <input type="date">
// from a form submission clears the column rather than failing validation.

export function toDate(
  v: string | Date | null | undefined,
): Date | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === '') return null;
  if (v instanceof Date) return v;
  return new Date(v);
}
