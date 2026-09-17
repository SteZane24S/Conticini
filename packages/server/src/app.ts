import { existsSync } from 'node:fs';
import path from 'node:path';

import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyInstance } from 'fastify';

export interface AppDeps {
  port: number;
  datasetId: string;
  versione: string;
  webDistPath?: string;
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

  const indexHtmlPath = deps.webDistPath
    ? path.join(deps.webDistPath, 'index.html')
    : undefined;

  if (indexHtmlPath && existsSync(indexHtmlPath)) {
    app.register(fastifyStatic, {
      root: deps.webDistPath,
    });

    app.setNotFoundHandler((request, reply) => {
      if (request.raw.url?.startsWith('/api')) {
        reply.code(404).send({ ok: false, errore: 'non trovato' });
        return;
      }
      reply.sendFile('index.html');
    });
  } else if (deps.webDistPath && existsSync(deps.webDistPath)) {
    app.log.warn(
      `webDistPath (${deps.webDistPath}) esiste ma non contiene index.html: file statici non serviti`,
    );
  }

  return { app, getLastHeartbeatMs: () => lastHeartbeatMs };
}
