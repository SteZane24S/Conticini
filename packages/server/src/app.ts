import { existsSync } from 'node:fs';
import path from 'node:path';

import fastifyStatic from '@fastify/static';
import { type DataISO, oggiLocale } from '@conticini/dominio';
import type Database from 'better-sqlite3';
import Fastify, { type FastifyInstance } from 'fastify';

import { eseguiCatchUp } from './catchUp.js';
import { registraGestoreErrori } from './errori.js';
import { registraRotteCategorie } from './routes/categorie.js';
import { registraRotteCicli } from './routes/cicli.js';
import { registraRotteConti } from './routes/conti.js';
import { registraRotteMovimenti } from './routes/movimenti.js';
import { registraRotteOccorrenze } from './routes/occorrenze.js';
import { registraRotteSettori } from './routes/settori.js';
import { registraRotteSpeseFisse } from './routes/speseFisse.js';
import { registraRotteStipendi } from './routes/stipendi.js';
import { registraRotteTrasferimenti } from './routes/trasferimenti.js';
import type { ContestoScrittura } from './scrittura.js';

export interface AppDeps {
  port: number;
  datasetId: string;
  versione: string;
  webDistPath?: string;
  db?: Database.Database;
  deviceId?: string;
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
  registraGestoreErrori(app);

  app.get('/api/salute', async () => ({
    ok: true,
    versione: deps.versione,
    datasetId: deps.datasetId,
  }));

  let lastHeartbeatMs = Date.now();
  let ctx: ContestoScrittura | undefined;
  let ultimoGiornoCatchUp: DataISO | undefined;

  app.post('/api/heartbeat', async () => {
    lastHeartbeatMs = Date.now();
    if (ctx) {
      const oggi = oggiLocale(new Date());
      if (oggi !== ultimoGiornoCatchUp) {
        eseguiCatchUp(ctx, oggi);
        ultimoGiornoCatchUp = oggi;
      }
    }
    return { ok: true };
  });

  if (deps.db && deps.deviceId) {
    ctx = { db: deps.db, deviceId: deps.deviceId };
    ultimoGiornoCatchUp = oggiLocale(new Date());
    eseguiCatchUp(ctx, ultimoGiornoCatchUp);
    registraRotteConti(app, ctx);
    registraRotteSettori(app, ctx);
    registraRotteCategorie(app, ctx);
    registraRotteMovimenti(app, ctx);
    registraRotteTrasferimenti(app, ctx);
    registraRotteStipendi(app, ctx);
    registraRotteCicli(app, ctx);
    registraRotteSpeseFisse(app, ctx);
    registraRotteOccorrenze(app, ctx);
  }

  const indexHtmlPath = deps.webDistPath
    ? path.join(deps.webDistPath, 'index.html')
    : undefined;

  if (indexHtmlPath && existsSync(indexHtmlPath)) {
    app.register(fastifyStatic, {
      root: deps.webDistPath,
    });
  } else if (deps.webDistPath && existsSync(deps.webDistPath)) {
    app.log.warn(
      `webDistPath (${deps.webDistPath}) esiste ma non contiene index.html: file statici non serviti`,
    );
  }

  app.setNotFoundHandler((request, reply) => {
    if (request.raw.url?.startsWith('/api')) {
      reply.code(404).send({
        ok: false,
        errore: { codice: 'non_trovato', messaggio: 'non trovato' },
      });
      return;
    }
    if (indexHtmlPath && existsSync(indexHtmlPath)) {
      reply.sendFile('index.html');
      return;
    }
    reply.code(404).send();
  });

  return { app, getLastHeartbeatMs: () => lastHeartbeatMs };
}
