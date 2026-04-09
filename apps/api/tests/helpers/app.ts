// Build a Fastify app instance for tests. Uses the production buildApp()
// so plugins and routes match real behavior exactly. Returns both the
// Fastify instance and its PrismaClient (so tests can reset state).

import { buildApp } from '../../src/server.js';
import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';

export async function makeTestApp(): Promise<{
  app: FastifyInstance;
  prisma: PrismaClient;
}> {
  const app = await buildApp();
  await app.ready();
  return { app, prisma: app.prisma as PrismaClient };
}
