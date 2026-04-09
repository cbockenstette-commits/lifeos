import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { DashboardSchema } from '@lifeos/shared';
import { buildDashboard } from '../services/dashboard.js';

const dashboardRoutes: FastifyPluginAsync = async (app) => {
  const f = app.withTypeProvider<ZodTypeProvider>();

  // GET /api/dashboard — single aggregator endpoint (ADR-4).
  // Uses the current user's stored timezone to resolve "today" and
  // "this week" bounds. Every section returns an empty array (never
  // null) so the frontend renders uniformly.
  f.get(
    '/',
    {
      schema: {
        response: { 200: DashboardSchema },
      },
    },
    async (req) => {
      const user = await app.prisma.user.findUniqueOrThrow({
        where: { id: req.user.id },
        select: { timezone: true },
      });
      return buildDashboard(app.prisma, req.user.id, user.timezone);
    },
  );
};

export default dashboardRoutes;
