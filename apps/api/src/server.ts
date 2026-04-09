import 'dotenv/config';
import Fastify from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import sensible from '@fastify/sensible';
import { HEALTH_CHECK_NAME } from '@lifeos/shared';

import prismaPlugin from './plugins/prisma.js';
import errorHandlerPlugin from './plugins/error-handler.js';
import authStubPlugin from './plugins/auth-stub.js';

import usersRoutes from './routes/users.js';
import areasRoutes from './routes/areas.js';
import projectsRoutes from './routes/projects.js';
import tasksRoutes from './routes/tasks.js';
import resourcesRoutes from './routes/resources.js';
import sprintsRoutes from './routes/sprints.js';
import tagsRoutes from './routes/tags.js';
import entityLinksRoutes from './routes/entity-links.js';
import dashboardRoutes from './routes/dashboard.js';

export async function buildApp() {
  const app = Fastify({
    logger:
      process.env.NODE_ENV === 'test'
        ? false
        : { level: process.env.LOG_LEVEL ?? 'info' },
  }).withTypeProvider<ZodTypeProvider>();

  // Zod validation + serialization.
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Core plugins.
  await app.register(sensible);
  await app.register(errorHandlerPlugin);
  await app.register(prismaPlugin);
  await app.register(authStubPlugin);

  // Liveness probe (no prefix, no auth coupling).
  app.get('/health', async () => ({
    status: 'ok',
    service: HEALTH_CHECK_NAME,
    timestamp: new Date().toISOString(),
  }));

  // Entity routes.
  await app.register(usersRoutes, { prefix: '/api/users' });
  await app.register(areasRoutes, { prefix: '/api/areas' });
  await app.register(projectsRoutes, { prefix: '/api/projects' });
  await app.register(tasksRoutes, { prefix: '/api/tasks' });
  await app.register(resourcesRoutes, { prefix: '/api/resources' });
  await app.register(sprintsRoutes, { prefix: '/api/sprints' });
  await app.register(tagsRoutes, { prefix: '/api/tags' });
  await app.register(entityLinksRoutes, { prefix: '/api/entity-links' });
  await app.register(dashboardRoutes, { prefix: '/api/dashboard' });

  return app;
}

async function start(): Promise<void> {
  const host = process.env.API_HOST ?? '127.0.0.1';
  const port = Number(process.env.API_PORT ?? 3000);
  const app = await buildApp();

  try {
    await app.listen({ host, port });
    app.log.info(`lifeos api listening on http://${host}:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

// Only auto-start when executed directly (not when imported by tests).
const entryModule = process.argv[1];
if (entryModule && entryModule.endsWith('server.ts')) {
  start();
} else if (entryModule && entryModule.endsWith('server.js')) {
  start();
}
