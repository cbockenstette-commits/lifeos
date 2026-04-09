import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import { LOCAL_USER_ID } from '../config.js';

// ADR-7: auth-ready architecture without auth in v1.
//
// This preHandler hook runs before every route and attaches the seeded
// local user to `request.user`. v1 has no JWT, no session, no Authorization
// header check — it's a fixed constant. When v2 adds real auth, the ONLY
// change is the body of the hook below: verify a JWT from the Authorization
// header, load the user, set request.user. Every route already reads from
// request.user.id — zero other changes required.

declare module 'fastify' {
  interface FastifyRequest {
    user: { id: string };
  }
}

const authStubPlugin: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', async (request) => {
    request.user = { id: LOCAL_USER_ID };
  });
};

export default fp(authStubPlugin, { name: 'auth-stub' });
