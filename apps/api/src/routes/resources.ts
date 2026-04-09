import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  ResourceSchema,
  ResourceCreateSchema,
  ResourceUpdateSchema,
  ListQuerySchema,
  UuidSchema,
} from '@lifeos/shared';
import { applyArchivedFilter } from '../services/archive.js';

const resourcesRoutes: FastifyPluginAsync = async (app) => {
  const f = app.withTypeProvider<ZodTypeProvider>();

  f.get(
    '/',
    {
      schema: {
        querystring: ListQuerySchema.extend({
          area_id: UuidSchema.optional(),
        }),
        response: { 200: z.array(ResourceSchema) },
      },
    },
    async (req) => {
      const where = applyArchivedFilter(
        {
          user_id: req.user.id,
          ...(req.query.area_id ? { area_id: req.query.area_id } : {}),
        },
        req.query,
      );
      return app.prisma.resource.findMany({
        where,
        orderBy: { created_at: 'desc' },
      });
    },
  );

  f.get(
    '/:id',
    {
      schema: {
        params: z.object({ id: UuidSchema }),
        response: { 200: ResourceSchema },
      },
    },
    async (req) => {
      return app.prisma.resource.findFirstOrThrow({
        where: { id: req.params.id, user_id: req.user.id },
      });
    },
  );

  f.post(
    '/',
    {
      schema: {
        body: ResourceCreateSchema,
        response: { 201: ResourceSchema },
      },
    },
    async (req, reply) => {
      const resource = await app.prisma.resource.create({
        data: { ...req.body, user_id: req.user.id },
      });
      return reply.code(201).send(resource);
    },
  );

  f.patch(
    '/:id',
    {
      schema: {
        params: z.object({ id: UuidSchema }),
        body: ResourceUpdateSchema,
        response: { 200: ResourceSchema },
      },
    },
    async (req) => {
      await app.prisma.resource.findFirstOrThrow({
        where: { id: req.params.id, user_id: req.user.id },
        select: { id: true },
      });
      return app.prisma.resource.update({
        where: { id: req.params.id },
        data: req.body,
      });
    },
  );

  f.delete(
    '/:id',
    {
      schema: {
        params: z.object({ id: UuidSchema }),
        response: { 200: ResourceSchema },
      },
    },
    async (req) => {
      await app.prisma.resource.findFirstOrThrow({
        where: { id: req.params.id, user_id: req.user.id },
        select: { id: true },
      });
      return app.prisma.resource.update({
        where: { id: req.params.id },
        data: { archived_at: new Date() },
      });
    },
  );
};

export default resourcesRoutes;
