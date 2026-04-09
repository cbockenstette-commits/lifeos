import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

// P2 stub. The real aggregator lands in P6. Returning an empty shape now
// so the frontend can wire up the query key in P3 without a 404.
const DashboardStubSchema = z.object({
  currentSprint: z.null(),
  inProgressTasks: z.array(z.unknown()),
  dueToday: z.array(z.unknown()),
  staleTasks: z.array(z.unknown()),
  weeklyFocusByArea: z.array(z.unknown()),
  recentResources: z.array(z.unknown()),
});

const dashboardRoutes: FastifyPluginAsync = async (app) => {
  const f = app.withTypeProvider<ZodTypeProvider>();

  f.get(
    '/',
    {
      schema: {
        response: { 200: DashboardStubSchema },
      },
    },
    async () => {
      return {
        currentSprint: null,
        inProgressTasks: [],
        dueToday: [],
        staleTasks: [],
        weeklyFocusByArea: [],
        recentResources: [],
      };
    },
  );
};

export default dashboardRoutes;
