// @lifeos/shared — single source of truth for Zod schemas, enums,
// and pure helpers used by both apps/api and apps/web.
//
// Prisma client types stay inside apps/api. Frontend imports these
// Zod schemas for form validation, the API imports them for
// fastify-type-provider-zod route validation. One contract, two
// consumers, zero codegen.

export const HEALTH_CHECK_NAME = 'lifeos' as const;

// Enums
export * from './enums.js';

// Schemas
export * from './schemas/common.js';
export * from './schemas/user.js';
export * from './schemas/area.js';
export * from './schemas/project.js';
export * from './schemas/task.js';
export * from './schemas/resource.js';
export * from './schemas/sprint.js';
export * from './schemas/tag.js';
export * from './schemas/entity-link.js';
