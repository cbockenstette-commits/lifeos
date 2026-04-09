import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { UserSchema, UserUpdateSchema } from '@lifeos/shared';
import { z } from 'zod';

const usersRoutes: FastifyPluginAsync = async (app) => {
  const f = app.withTypeProvider<ZodTypeProvider>();

  // GET /api/users/me — return the current user row.
  f.get(
    '/me',
    {
      schema: {
        response: { 200: UserSchema },
      },
    },
    async (req) => {
      const user = await app.prisma.user.findUniqueOrThrow({
        where: { id: req.user.id },
      });
      return user;
    },
  );

  // PATCH /api/users/me — update name and/or timezone.
  f.patch(
    '/me',
    {
      schema: {
        body: UserUpdateSchema,
        response: { 200: UserSchema },
      },
    },
    async (req) => {
      const updated = await app.prisma.user.update({
        where: { id: req.user.id },
        data: req.body,
      });
      return updated;
    },
  );

  // Suppress unused-import warning for z when the file has no other usage.
  void z;
};

export default usersRoutes;
