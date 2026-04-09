import { z } from 'zod';
import { UuidSchema, TimestampSchema, TimezoneSchema } from './common.js';

// Response shape (what the API returns).
export const UserSchema = z.object({
  id: UuidSchema,
  email: z.string().email(),
  name: z.string(),
  timezone: TimezoneSchema,
  created_at: TimestampSchema,
  updated_at: TimestampSchema,
});
export type User = z.infer<typeof UserSchema>;

// PATCH /api/users/me — only name and timezone are user-editable in v1.
export const UserUpdateSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    timezone: TimezoneSchema.optional(),
  })
  .refine((data) => data.name !== undefined || data.timezone !== undefined, {
    message: 'At least one of name or timezone must be provided',
  });
export type UserUpdate = z.infer<typeof UserUpdateSchema>;
