import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  EntityLinkSchema,
  EntityLinkCreateSchema,
  EntityTypeSchema,
  HydratedLinksSchema,
  UuidSchema,
  type EntityLink,
  type EntityType,
  type HydratedEntity,
  type RelationType,
} from '@lifeos/shared';
import { assertEntityExists } from '../services/entity-links.js';
import { hydrateEntities } from '../services/hydrate.js';

// Prisma stores relation_type as string (whitelisted via raw SQL CHECK).
// Coerce the returned row to the stricter Zod response type. The DB CHECK
// guarantees the value is one of the enum variants.
function toEntityLink(row: {
  id: string;
  user_id: string;
  source_type: 'area' | 'project' | 'task' | 'resource';
  source_id: string;
  target_type: 'area' | 'project' | 'task' | 'resource';
  target_id: string;
  relation_type: string;
  created_at: Date;
}): EntityLink {
  return { ...row, relation_type: row.relation_type as RelationType };
}

const entityLinksRoutes: FastifyPluginAsync = async (app) => {
  const f = app.withTypeProvider<ZodTypeProvider>();

  // GET /api/entity-links?entity_type=task&entity_id=...&direction=both
  f.get(
    '/',
    {
      schema: {
        querystring: z.object({
          entity_type: EntityTypeSchema,
          entity_id: UuidSchema,
          direction: z.enum(['outgoing', 'incoming', 'both']).optional(),
        }),
        response: { 200: z.array(EntityLinkSchema) },
      },
    },
    async (req) => {
      const { entity_type, entity_id } = req.query;
      const direction = req.query.direction ?? 'both';
      const where =
        direction === 'outgoing'
          ? {
              user_id: req.user.id,
              source_type: entity_type,
              source_id: entity_id,
            }
          : direction === 'incoming'
            ? {
                user_id: req.user.id,
                target_type: entity_type,
                target_id: entity_id,
              }
            : {
                user_id: req.user.id,
                OR: [
                  { source_type: entity_type, source_id: entity_id },
                  { target_type: entity_type, target_id: entity_id },
                ],
              };
      const rows = await app.prisma.entityLink.findMany({
        where,
        orderBy: { created_at: 'desc' },
      });
      return rows.map(toEntityLink);
    },
  );

  // GET /api/entity-links/hydrated?entity_type=X&entity_id=Y
  // Returns { outgoing, incoming } where each edge has the "other end"
  // entity hydrated. Default filter: exclude archived. Used by the
  // backlinks panel on every detail page.
  f.get(
    '/hydrated',
    {
      schema: {
        querystring: z.object({
          entity_type: EntityTypeSchema,
          entity_id: UuidSchema,
          includeArchived: z
            .union([z.literal('true'), z.literal('false'), z.boolean()])
            .optional()
            .transform((v) => v === true || v === 'true'),
        }),
        response: { 200: HydratedLinksSchema },
      },
    },
    async (req) => {
      const { entity_type, entity_id, includeArchived } = req.query;

      const [outgoingRows, incomingRows] = await Promise.all([
        app.prisma.entityLink.findMany({
          where: {
            user_id: req.user.id,
            source_type: entity_type,
            source_id: entity_id,
          },
          orderBy: { created_at: 'desc' },
        }),
        app.prisma.entityLink.findMany({
          where: {
            user_id: req.user.id,
            target_type: entity_type,
            target_id: entity_id,
          },
          orderBy: { created_at: 'desc' },
        }),
      ]);

      const refsToFetch = [
        ...outgoingRows.map((l) => ({
          type: l.target_type as EntityType,
          id: l.target_id,
        })),
        ...incomingRows.map((l) => ({
          type: l.source_type as EntityType,
          id: l.source_id,
        })),
      ];
      const hydrated = await hydrateEntities(
        app.prisma,
        req.user.id,
        refsToFetch,
        { includeArchived },
      );
      // Index by composite key so lookup is O(1).
      const hydratedMap = new Map<string, HydratedEntity>(
        hydrated.map((h) => [`${h.type}:${h.id}`, h]),
      );

      const outgoing = outgoingRows
        .map((l) => {
          const other = hydratedMap.get(`${l.target_type}:${l.target_id}`);
          return other
            ? {
                link_id: l.id,
                relation_type: l.relation_type as RelationType,
                other,
              }
            : null;
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);

      const incoming = incomingRows
        .map((l) => {
          const other = hydratedMap.get(`${l.source_type}:${l.source_id}`);
          return other
            ? {
                link_id: l.id,
                relation_type: l.relation_type as RelationType,
                other,
              }
            : null;
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);

      return { outgoing, incoming };
    },
  );

  f.post(
    '/',
    {
      schema: {
        body: EntityLinkCreateSchema,
        response: { 201: EntityLinkSchema },
      },
    },
    async (req, reply) => {
      await assertEntityExists(
        app.prisma,
        req.user.id,
        req.body.source_type,
        req.body.source_id,
      );
      await assertEntityExists(
        app.prisma,
        req.user.id,
        req.body.target_type,
        req.body.target_id,
      );
      const link = await app.prisma.entityLink.upsert({
        where: {
          source_type_source_id_target_type_target_id_relation_type: {
            source_type: req.body.source_type,
            source_id: req.body.source_id,
            target_type: req.body.target_type,
            target_id: req.body.target_id,
            relation_type: req.body.relation_type ?? 'references',
          },
        },
        update: {},
        create: {
          user_id: req.user.id,
          source_type: req.body.source_type,
          source_id: req.body.source_id,
          target_type: req.body.target_type,
          target_id: req.body.target_id,
          relation_type: req.body.relation_type ?? 'references',
        },
      });
      return reply.code(201).send(toEntityLink(link));
    },
  );

  f.delete(
    '/:id',
    {
      schema: {
        params: z.object({ id: UuidSchema }),
        response: { 204: z.null() },
      },
    },
    async (req, reply) => {
      await app.prisma.entityLink.findFirstOrThrow({
        where: { id: req.params.id, user_id: req.user.id },
        select: { id: true },
      });
      await app.prisma.entityLink.delete({ where: { id: req.params.id } });
      return reply.code(204).send(null);
    },
  );
};

export default entityLinksRoutes;
