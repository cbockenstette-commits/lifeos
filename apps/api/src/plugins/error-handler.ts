import fp from 'fastify-plugin';
import type { FastifyError, FastifyPluginAsync } from 'fastify';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

// Global error handler. Maps domain error types to consistent JSON
// responses that match the shape documented in rules/code/api-design.md:
//   { error: { code, message, details? } }

function isFastifyError(err: unknown): err is FastifyError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'statusCode' in err &&
    typeof (err as { statusCode?: unknown }).statusCode === 'number'
  );
}

function hasValidation(err: unknown): err is FastifyError & { validation: unknown[] } {
  return (
    typeof err === 'object' &&
    err !== null &&
    'validation' in err &&
    Array.isArray((err as { validation?: unknown }).validation)
  );
}

const errorHandlerPlugin: FastifyPluginAsync = async (app) => {
  app.setErrorHandler((error, request, reply) => {
    // Zod validation errors from fastify-type-provider-zod.
    if (error instanceof ZodError) {
      return reply.code(422).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request failed validation',
          details: error.issues,
        },
      });
    }

    if (hasValidation(error)) {
      return reply.code(422).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message || 'Request failed validation',
          details: error.validation,
        },
      });
    }

    // Prisma known errors — map a few common ones to HTTP codes.
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Record not found',
          },
        });
      }
      if (error.code === 'P2002') {
        return reply.code(409).send({
          error: {
            code: 'CONFLICT',
            message: 'Unique constraint violation',
            details: { target: (error.meta as { target?: unknown })?.target },
          },
        });
      }
      if (error.code === 'P2003') {
        return reply.code(422).send({
          error: {
            code: 'FOREIGN_KEY_VIOLATION',
            message: 'Referenced record does not exist',
          },
        });
      }
    }

    // Raw Postgres CHECK constraint violations can bubble as unknown request errors.
    if (error instanceof Prisma.PrismaClientUnknownRequestError) {
      return reply.code(422).send({
        error: {
          code: 'DB_CONSTRAINT_VIOLATION',
          message: error.message,
        },
      });
    }

    // HttpError from @fastify/sensible (reply.notFound(), etc.) — 4xx class.
    if (isFastifyError(error)) {
      const status = error.statusCode ?? 500;
      if (status >= 400 && status < 500) {
        return reply.code(status).send({
          error: {
            code: error.name ?? 'CLIENT_ERROR',
            message: error.message,
          },
        });
      }
    }

    // Unknown — log and return 500.
    request.log.error({ err: error }, 'Unhandled error in request');
    return reply.code(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  });
};

export default fp(errorHandlerPlugin, { name: 'error-handler' });
