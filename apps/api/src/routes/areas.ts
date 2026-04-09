import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  AreaSchema,
  AreaCreateSchema,
  AreaUpdateSchema,
  ListQuerySchema,
  UuidSchema,
} from '@lifeos/shared';
import { applyArchivedFilter } from '../services/archive.js';

const areasRoutes: FastifyPluginAsync = async (app) => {
  const f = app.withTypeProvider<ZodTypeProvider>();

  f.get(
    '/',
    {
      schema: {
        querystring: ListQuerySchema,
        response: { 200: z.array(AreaSchema) },
      },
    },
    async (req) => {
      const where = applyArchivedFilter({ user_id: req.user.id }, req.query);
      return app.prisma.area.findMany({
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
        response: { 200: AreaSchema },
      },
    },
    async (req) => {
      return app.prisma.area.findFirstOrThrow({
        where: { id: req.params.id, user_id: req.user.id },
      });
    },
  );

  f.post(
    '/',
    {
      schema: {
        body: AreaCreateSchema,
        response: { 201: AreaSchema },
      },
    },
    async (req, reply) => {
      const area = await app.prisma.area.create({
        data: { ...req.body, user_id: req.user.id },
      });
      return reply.code(201).send(area);
    },
  );

  f.patch(
    '/:id',
    {
      schema: {
        params: z.object({ id: UuidSchema }),
        body: AreaUpdateSchema,
        response: { 200: AreaSchema },
      },
    },
    async (req) => {
      // Ownership check via findFirstOrThrow -> then update by id.
      await app.prisma.area.findFirstOrThrow({
        where: { id: req.params.id, user_id: req.user.id },
        select: { id: true },
      });
      return app.prisma.area.update({
        where: { id: req.params.id },
        data: req.body,
      });
    },
  );

  // DELETE = soft delete (archive). See ADR-3.
  f.delete(
    '/:id',
    {
      schema: {
        params: z.object({ id: UuidSchema }),
        response: { 200: AreaSchema },
      },
    },
    async (req) => {
      await app.prisma.area.findFirstOrThrow({
        where: { id: req.params.id, user_id: req.user.id },
        select: { id: true },
      });
      return app.prisma.area.update({
        where: { id: req.params.id },
        data: { archived_at: new Date() },
      });
    },
  );

  // POST /:id/unarchive — restore an archived area.
  f.post(
    '/:id/unarchive',
    {
      schema: {
        params: z.object({ id: UuidSchema }),
        response: { 200: AreaSchema },
      },
    },
    async (req) => {
      await app.prisma.area.findFirstOrThrow({
        where: { id: req.params.id, user_id: req.user.id },
        select: { id: true },
      });
      return app.prisma.area.update({
        where: { id: req.params.id },
        data: { archived_at: null },
      });
    },
  );
};

export default areasRoutes;
