import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  SprintSchema,
  SprintCreateSchema,
  SprintUpdateSchema,
  UuidSchema,
  endOfSprint,
} from '@lifeos/shared';
import { getOrCreateCurrentSprint } from '../services/current-sprint.js';

const sprintsRoutes: FastifyPluginAsync = async (app) => {
  const f = app.withTypeProvider<ZodTypeProvider>();

  f.get(
    '/',
    {
      schema: {
        response: { 200: z.array(SprintSchema) },
      },
    },
    async (req) => {
      return app.prisma.sprint.findMany({
        where: { user_id: req.user.id },
        orderBy: { start_date: 'desc' },
      });
    },
  );

  // GET /api/sprints/current — find-or-create the sprint containing today
  // in the user's configured timezone.
  f.get(
    '/current',
    {
      schema: {
        response: { 200: SprintSchema },
      },
    },
    async (req) => {
      const user = await app.prisma.user.findUniqueOrThrow({
        where: { id: req.user.id },
        select: { timezone: true },
      });
      return getOrCreateCurrentSprint(app.prisma, req.user.id, user.timezone);
    },
  );

  f.get(
    '/:id',
    {
      schema: {
        params: z.object({ id: UuidSchema }),
        response: { 200: SprintSchema },
      },
    },
    async (req) => {
      return app.prisma.sprint.findFirstOrThrow({
        where: { id: req.params.id, user_id: req.user.id },
      });
    },
  );

  f.post(
    '/',
    {
      schema: {
        body: SprintCreateSchema,
        response: { 201: SprintSchema },
      },
    },
    async (req, reply) => {
      // end_date is derived from start_date; the DB CHECK enforces this
      // relationship, but we compute it server-side so callers never send a
      // wrong end_date.
      const startYmd =
        req.body.start_date instanceof Date
          ? req.body.start_date.toISOString().slice(0, 10)
          : req.body.start_date;
      const endYmd = endOfSprint(startYmd);
      const end_date = new Date(`${endYmd}T00:00:00.000Z`);
      const start_date = new Date(`${startYmd}T00:00:00.000Z`);

      const sprint = await app.prisma.sprint.create({
        data: {
          user_id: req.user.id,
          start_date,
          end_date,
          status: req.body.status ?? 'planned',
          goal: req.body.goal ?? null,
        },
      });
      return reply.code(201).send(sprint);
    },
  );

  f.patch(
    '/:id',
    {
      schema: {
        params: z.object({ id: UuidSchema }),
        body: SprintUpdateSchema,
        response: { 200: SprintSchema },
      },
    },
    async (req) => {
      await app.prisma.sprint.findFirstOrThrow({
        where: { id: req.params.id, user_id: req.user.id },
        select: { id: true },
      });
      return app.prisma.sprint.update({
        where: { id: req.params.id },
        data: req.body,
      });
    },
  );
};

export default sprintsRoutes;
