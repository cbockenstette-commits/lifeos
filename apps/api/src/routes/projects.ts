import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  ProjectSchema,
  ProjectCreateSchema,
  ProjectUpdateSchema,
  ListQuerySchema,
  UuidSchema,
} from '@lifeos/shared';
import { applyArchivedFilter } from '../services/archive.js';
import { computePriorityScore } from '../lib/prioritize.js';
import { toDate } from '../lib/coerce.js';

void computePriorityScore; // reserved for a future "recompute scores" endpoint

const projectsRoutes: FastifyPluginAsync = async (app) => {
  const f = app.withTypeProvider<ZodTypeProvider>();

  f.get(
    '/',
    {
      schema: {
        querystring: ListQuerySchema.extend({
          area_id: UuidSchema.optional(),
          status: z.string().optional(),
        }),
        response: { 200: z.array(ProjectSchema) },
      },
    },
    async (req) => {
      const where = applyArchivedFilter(
        {
          user_id: req.user.id,
          ...(req.query.area_id ? { area_id: req.query.area_id } : {}),
          ...(req.query.status
            ? { status: req.query.status as never }
            : {}),
        },
        req.query,
      );
      return app.prisma.project.findMany({
        where,
        orderBy: [{ priority_score: 'desc' }, { created_at: 'desc' }],
      });
    },
  );

  f.get(
    '/:id',
    {
      schema: {
        params: z.object({ id: UuidSchema }),
        response: { 200: ProjectSchema },
      },
    },
    async (req) => {
      return app.prisma.project.findFirstOrThrow({
        where: { id: req.params.id, user_id: req.user.id },
      });
    },
  );

  f.post(
    '/',
    {
      schema: {
        body: ProjectCreateSchema,
        response: { 201: ProjectSchema },
      },
    },
    async (req, reply) => {
      const project = await app.prisma.project.create({
        data: {
          ...req.body,
          target_date: toDate(req.body.target_date),
          user_id: req.user.id,
        },
      });
      return reply.code(201).send(project);
    },
  );

  f.patch(
    '/:id',
    {
      schema: {
        params: z.object({ id: UuidSchema }),
        body: ProjectUpdateSchema,
        response: { 200: ProjectSchema },
      },
    },
    async (req) => {
      await app.prisma.project.findFirstOrThrow({
        where: { id: req.params.id, user_id: req.user.id },
        select: { id: true },
      });
      const data: Record<string, unknown> = { ...req.body };
      if (req.body.target_date !== undefined) {
        data.target_date = toDate(req.body.target_date);
      }
      if (req.body.completed_at !== undefined) {
        data.completed_at = toDate(req.body.completed_at);
      }
      return app.prisma.project.update({
        where: { id: req.params.id },
        data,
      });
    },
  );

  f.delete(
    '/:id',
    {
      schema: {
        params: z.object({ id: UuidSchema }),
        response: { 200: ProjectSchema },
      },
    },
    async (req) => {
      await app.prisma.project.findFirstOrThrow({
        where: { id: req.params.id, user_id: req.user.id },
        select: { id: true },
      });
      return app.prisma.project.update({
        where: { id: req.params.id },
        data: { archived_at: new Date() },
      });
    },
  );

  f.post(
    '/:id/unarchive',
    {
      schema: {
        params: z.object({ id: UuidSchema }),
        response: { 200: ProjectSchema },
      },
    },
    async (req) => {
      await app.prisma.project.findFirstOrThrow({
        where: { id: req.params.id, user_id: req.user.id },
        select: { id: true },
      });
      return app.prisma.project.update({
        where: { id: req.params.id },
        data: { archived_at: null },
      });
    },
  );
};

export default projectsRoutes;
