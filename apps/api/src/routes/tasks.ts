import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  TaskSchema,
  TaskCreateSchema,
  TaskUpdateSchema,
  ListQuerySchema,
  UuidSchema,
  validateTaskParentXor,
  TaskParentXorMessage,
} from '@lifeos/shared';
import { applyArchivedFilter } from '../services/archive.js';
import { computePriorityScore } from '../lib/prioritize.js';

const tasksRoutes: FastifyPluginAsync = async (app) => {
  const f = app.withTypeProvider<ZodTypeProvider>();

  f.get(
    '/',
    {
      schema: {
        querystring: ListQuerySchema.extend({
          project_id: UuidSchema.optional(),
          area_id: UuidSchema.optional(),
          sprint_id: UuidSchema.optional(),
          status: z.string().optional(),
        }),
        response: { 200: z.array(TaskSchema) },
      },
    },
    async (req) => {
      const where = applyArchivedFilter(
        {
          user_id: req.user.id,
          ...(req.query.project_id ? { project_id: req.query.project_id } : {}),
          ...(req.query.area_id ? { area_id: req.query.area_id } : {}),
          ...(req.query.sprint_id ? { sprint_id: req.query.sprint_id } : {}),
          ...(req.query.status ? { status: req.query.status as never } : {}),
        },
        req.query,
      );
      return app.prisma.task.findMany({
        where,
        orderBy: [{ sort_order: 'asc' }, { created_at: 'desc' }],
      });
    },
  );

  f.get(
    '/:id',
    {
      schema: {
        params: z.object({ id: UuidSchema }),
        response: { 200: TaskSchema },
      },
    },
    async (req) => {
      return app.prisma.task.findFirstOrThrow({
        where: { id: req.params.id, user_id: req.user.id },
      });
    },
  );

  f.post(
    '/',
    {
      schema: {
        body: TaskCreateSchema,
        response: { 201: TaskSchema },
      },
    },
    async (req, reply) => {
      const urgency = req.body.urgency ?? 0;
      const importance = req.body.importance ?? 0;
      const priority_score =
        req.body.priority_score ?? computePriorityScore(urgency, importance);
      const task = await app.prisma.task.create({
        data: {
          ...req.body,
          urgency,
          importance,
          priority_score,
          user_id: req.user.id,
        },
      });
      return reply.code(201).send(task);
    },
  );

  f.patch(
    '/:id',
    {
      schema: {
        params: z.object({ id: UuidSchema }),
        body: TaskUpdateSchema,
        response: { 200: TaskSchema },
      },
    },
    async (req) => {
      const current = await app.prisma.task.findFirstOrThrow({
        where: { id: req.params.id, user_id: req.user.id },
        select: { id: true, project_id: true, area_id: true, urgency: true, importance: true },
      });

      // XOR re-check after merging the patch. Throwing a Zod error lets the
      // global error handler map it to a clean 422 with the standard shape.
      if (!validateTaskParentXor(current, req.body)) {
        const err = new Error(TaskParentXorMessage) as Error & {
          statusCode?: number;
          validation?: unknown[];
        };
        err.statusCode = 422;
        err.validation = [{ message: TaskParentXorMessage, path: ['project_id', 'area_id'] }];
        throw err;
      }

      // Recompute priority_score when urgency or importance changes,
      // unless the caller explicitly overrides it.
      const nextUrgency = req.body.urgency ?? current.urgency;
      const nextImportance = req.body.importance ?? current.importance;
      const data: typeof req.body = { ...req.body };
      if (
        data.priority_score === undefined &&
        (req.body.urgency !== undefined || req.body.importance !== undefined)
      ) {
        data.priority_score = computePriorityScore(nextUrgency, nextImportance);
      }

      return app.prisma.task.update({
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
        response: { 200: TaskSchema },
      },
    },
    async (req) => {
      await app.prisma.task.findFirstOrThrow({
        where: { id: req.params.id, user_id: req.user.id },
        select: { id: true },
      });
      return app.prisma.task.update({
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
        response: { 200: TaskSchema },
      },
    },
    async (req) => {
      await app.prisma.task.findFirstOrThrow({
        where: { id: req.params.id, user_id: req.user.id },
        select: { id: true },
      });
      return app.prisma.task.update({
        where: { id: req.params.id },
        data: { archived_at: null },
      });
    },
  );
};

export default tasksRoutes;
