// ADR-7: auth-ready single-user architecture.
//
// LOCAL_USER_ID is the fixed UUID of the seeded v1 user. Every service function
// and route that needs a user_id reads it from `request.user.id`, which the
// auth-stub plugin populates with this constant. When v2 adds real auth, only
// the auth plugin changes — nothing else in the codebase.
//
// This ID is written into the database by `prisma/seed.ts`. If you regenerate
// the seed with a different ID, update this constant to match.

export const LOCAL_USER_ID = '00000000-0000-0000-0000-000000000001' as const;
export const LOCAL_USER_EMAIL = 'me@local' as const;
export const LOCAL_USER_NAME = 'Me' as const;
export const DEFAULT_TIMEZONE = 'America/Boise' as const;
