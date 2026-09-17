import Fastify, { type FastifyInstance } from 'fastify';

export interface AppDeps {
  port: number;
  datasetId: string;
  versione: string;
}

export interface BuiltApp {
  app: FastifyInstance;
  getLastHeartbeatMs: () => number;
}

export function buildApp(deps: AppDeps): BuiltApp {
  const app = Fastify();
  const allowedHosts = new Set([
    `127.0.0.1:${deps.port}`,
    `localhost:${deps.port}`,
  ]);

  app.addHook('onRequest', async (request, reply) => {
    const host = request.headers.host?.toLowerCase();
    if (!host || !allowedHosts.has(host)) {
      return reply.code(421).send();
    }
  });

  app.get('/api/salute', async () => ({
    ok: true,
    versione: deps.versione,
    datasetId: deps.datasetId,
  }));

  let lastHeartbeatMs = Date.now();
  app.post('/api/heartbeat', async () => {
    lastHeartbeatMs = Date.now();
    return { ok: true };
  });

  return { app, getLastHeartbeatMs: () => lastHeartbeatMs };
}
