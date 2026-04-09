import Fastify from 'fastify';
import { HEALTH_CHECK_NAME } from '@lifeos/shared';

const HOST = process.env.API_HOST ?? '127.0.0.1';
const PORT = Number(process.env.API_PORT ?? 3000);

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? 'info',
  },
});

app.get('/health', async () => {
  return {
    status: 'ok',
    service: HEALTH_CHECK_NAME,
    timestamp: new Date().toISOString(),
  };
});

async function start(): Promise<void> {
  try {
    await app.listen({ host: HOST, port: PORT });
    app.log.info(`lifeos api listening on http://${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
