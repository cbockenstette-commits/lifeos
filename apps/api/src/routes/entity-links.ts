import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  EntityLinkSchema,
  EntityLinkCreateSchema,
  EntityTypeSchema,
  UuidSchema,
  type EntityLink,
  type RelationType,
} from '@lifeos/shared';
import { assertEntityExists } from '../services/entity-links.js';

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
