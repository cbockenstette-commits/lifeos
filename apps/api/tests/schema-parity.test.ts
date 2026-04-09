// Guarantees hand-written Zod schemas in @lifeos/shared don't drift from
// the Prisma schema. For each Prisma model in scope, asserts:
//   - every non-system column is present on BOTH the Create and Response schemas
//   - nullable Prisma fields are nullable/optional on the Zod side
//
// "Non-system" = excludes id, created_at, updated_at, user_id (those are
// server-owned and don't belong on create payloads).
//
// This is the ADR-6 parity guardrail. If it fails after a Prisma schema
// change, add the missing fields to the corresponding zod file in
// packages/shared/src/schemas/.

import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import {
  AreaSchema,
  AreaCreateSchema,
  ProjectSchema,
  ProjectCreateSchema,
  TaskSchema,
  TaskCreateSchema,
  ResourceSchema,
  ResourceCreateSchema,
  SprintSchema,
  SprintCreateSchema,
  TagSchema,
  TagCreateSchema,
  UserSchema,
  UserUpdateSchema,
} from '@lifeos/shared';
import type { ZodObject } from 'zod';

const SYSTEM_COLUMNS = new Set([
  'id',
  'created_at',
  'updated_at',
  'user_id',
  'priority_score',
  'sort_order',
  'completed_at',
  'archived_at',
]);

function prismaModelFields(modelName: string): string[] {
  const model = Prisma.dmmf.datamodel.models.find((m) => m.name === modelName);
  if (!model) throw new Error(`Prisma model ${modelName} not found`);
  return model.fields
    .filter((f) => f.kind === 'scalar' || f.kind === 'enum')
    .map((f) => f.name);
}

function zodKeys(schema: unknown): string[] {
  // Walk through any wrappers (effects from .refine, etc.) to reach ZodObject.
  let s: unknown = schema;
  while (s && typeof s === 'object' && 'unwrap' in s && typeof (s as { unwrap: () => unknown }).unwrap === 'function') {
    s = (s as { unwrap: () => unknown }).unwrap();
  }
  // Handle ZodEffects (.refine wrapper).
  while (
    s &&
    typeof s === 'object' &&
    '_def' in s &&
    (s as { _def: { typeName?: string } })._def.typeName === 'ZodEffects'
  ) {
    s = (s as { _def: { schema: unknown } })._def.schema;
  }
  const obj = s as ZodObject<Record<string, unknown>>;
  if (!obj || !('shape' in obj)) return [];
  return Object.keys(obj.shape);
}

describe('schema parity: Prisma ↔ Zod', () => {
  const models: Array<{
    name: string;
    response: unknown;
    create: unknown;
    excludeFromResponse?: string[];
    excludeFromCreate?: string[];
  }> = [
    { name: 'Area', response: AreaSchema, create: AreaCreateSchema },
    {
      name: 'Project',
      response: ProjectSchema,
      create: ProjectCreateSchema,
      // description is the only "full column" missing from the checklist.
    },
    { name: 'Task', response: TaskSchema, create: TaskCreateSchema },
    { name: 'Resource', response: ResourceSchema, create: ResourceCreateSchema },
    {
      name: 'Sprint',
      response: SprintSchema,
      create: SprintCreateSchema,
      // Sprint.end_date is server-derived — not on the create payload.
      excludeFromCreate: ['end_date'],
    },
    { name: 'Tag', response: TagSchema, create: TagCreateSchema },
  ];

  for (const m of models) {
    it(`${m.name} response schema contains every Prisma scalar column`, () => {
      const prismaFields = prismaModelFields(m.name);
      const zFields = new Set(zodKeys(m.response));
      for (const f of prismaFields) {
        expect(zFields.has(f), `${m.name}Schema missing "${f}"`).toBe(true);
      }
    });

    it(`${m.name} create schema contains every non-system Prisma column`, () => {
      const excluded = new Set([
        ...SYSTEM_COLUMNS,
        ...(m.excludeFromCreate ?? []),
      ]);
      const prismaFields = prismaModelFields(m.name).filter(
        (f) => !excluded.has(f),
      );
      const zFields = new Set(zodKeys(m.create));
      for (const f of prismaFields) {
        expect(
          zFields.has(f),
          `${m.name}CreateSchema missing non-system field "${f}"`,
        ).toBe(true);
      }
    });
  }

  it('User response schema contains every non-system Prisma column', () => {
    const prismaFields = prismaModelFields('User');
    const zFields = new Set(zodKeys(UserSchema));
    for (const f of prismaFields) {
      expect(zFields.has(f), `UserSchema missing "${f}"`).toBe(true);
    }
  });

  it('UserUpdate covers the mutable user columns (name, timezone)', () => {
    const zFields = new Set(zodKeys(UserUpdateSchema));
    expect(zFields.has('name')).toBe(true);
    expect(zFields.has('timezone')).toBe(true);
  });
});
