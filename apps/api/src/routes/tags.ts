import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  TagSchema,
  TagCreateSchema,
  TagUpdateSchema,
  TagAttachSchema,
  EntityTagSchema,
  UuidSchema,
} from '@lifeos/shared';
import { assertEntityExists } from '../services/entity-links.js';

const tagsRoutes: FastifyPluginAsync = async (app) => {
  const f = app.withTypeProvider<ZodTypeProvider>();

  f.get(
    '/',
    {
      schema: {
        response: { 200: z.array(TagSchema) },
      },
    },
    async (req) => {
      return app.prisma.tag.findMany({
        where: { user_id: req.user.id },
        orderBy: { name: 'asc' },
      });
    },
  );

  f.get(
    '/:id',
    {
      schema: {
        params: z.object({ id: UuidSchema }),
        response: { 200: TagSchema },
      },
    },
    async (req) => {
      return app.prisma.tag.findFirstOrThrow({
        where: { id: req.params.id, user_id: req.user.id },
      });
    },
  );

  f.post(
    '/',
    {
      schema: {
        body: TagCreateSchema,
        response: { 201: TagSchema },
      },
    },
    async (req, reply) => {
      const tag = await app.prisma.tag.create({
        data: { ...req.body, user_id: req.user.id },
      });
      return reply.code(201).send(tag);
    },
  );

  f.patch(
    '/:id',
    {
      schema: {
        params: z.object({ id: UuidSchema }),
        body: TagUpdateSchema,
        response: { 200: TagSchema },
      },
    },
    async (req) => {
      await app.prisma.tag.findFirstOrThrow({
        where: { id: req.params.id, user_id: req.user.id },
        select: { id: true },
      });
      return app.prisma.tag.update({
        where: { id: req.params.id },
        data: req.body,
      });
    },
  );

  f.delete(
    '/:id',
    {
      schema: {
        params: z.object({ id: UuidSchema }),
        response: { 204: z.null() },
      },
    },
    async (req, reply) => {
      await app.prisma.tag.findFirstOrThrow({
        where: { id: req.params.id, user_id: req.user.id },
        select: { id: true },
      });
      // Tag delete is one of the few hard-delete paths — tags are pure
      // metadata and you genuinely want them gone when unused. Cascade
      // removes the EntityTag join rows automatically.
      await app.prisma.tag.delete({ where: { id: req.params.id } });
      return reply.code(204).send(null);
    },
  );

  // POST /api/tags/:id/attach — attach a tag to a polymorphic entity.
  f.post(
    '/:id/attach',
    {
      schema: {
        params: z.object({ id: UuidSchema }),
        body: TagAttachSchema,
        response: { 201: EntityTagSchema },
      },
    },
    async (req, reply) => {
      await app.prisma.tag.findFirstOrThrow({
        where: { id: req.params.id, user_id: req.user.id },
        select: { id: true },
      });
      await assertEntityExists(
        app.prisma,
        req.user.id,
        req.body.entity_type,
        req.body.entity_id,
      );
      const entityTag = await app.prisma.entityTag.upsert({
        where: {
          tag_id_entity_type_entity_id: {
            tag_id: req.params.id,
            entity_type: req.body.entity_type,
            entity_id: req.body.entity_id,
          },
        },
        update: {},
        create: {
          tag_id: req.params.id,
          entity_type: req.body.entity_type,
          entity_id: req.body.entity_id,
        },
      });
      return reply.code(201).send(entityTag);
    },
  );

  // POST /api/tags/:id/detach — remove a tag from a polymorphic entity.
  f.post(
    '/:id/detach',
    {
      schema: {
        params: z.object({ id: UuidSchema }),
        body: TagAttachSchema,
        response: { 204: z.null() },
      },
    },
    async (req, reply) => {
      await app.prisma.tag.findFirstOrThrow({
        where: { id: req.params.id, user_id: req.user.id },
        select: { id: true },
      });
      await app.prisma.entityTag.deleteMany({
        where: {
          tag_id: req.params.id,
          entity_type: req.body.entity_type,
          entity_id: req.body.entity_id,
        },
      });
      return reply.code(204).send(null);
    },
  );
};

export default tagsRoutes;
