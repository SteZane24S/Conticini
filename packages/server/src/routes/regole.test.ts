import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import Database from 'better-sqlite3';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';

import { registraGestoreErrori } from '../errori.js';
import { runMigrations } from '../migrations-runner.js';
import { inserisci, type ContestoScrittura } from '../scrittura.js';
import { registraRotteRegole } from './regole.js';

describe('rotte regole', () => {
  let dir: string | undefined;
  let db: Database.Database | undefined;
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
    db?.close();
    db = undefined;
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
      dir = undefined;
    }
  });

  function creaApp(): FastifyInstance {
    dir = mkdtempSync(path.join(tmpdir(), 'conticini-rotte-regole-'));
    db = new Database(path.join(dir, 'conticini.db'));
    runMigrations(db);
    const ctx: ContestoScrittura = { db, deviceId: 'device-test' };
    inserisci(ctx, 'sectors', 'sectors', 'settore-1', { name: 'Spese' });
    inserisci(ctx, 'categories', 'categories', 'categoria-a', {
      sector_id: 'settore-1',
      name: 'Spesa A',
      kind: 'uscita',
    });
    inserisci(ctx, 'categories', 'categories', 'categoria-b', {
      sector_id: 'settore-1',
      name: 'Spesa B',
      kind: 'uscita',
    });
    app = Fastify();
    registraGestoreErrori(app);
    registraRotteRegole(app, ctx);
    return app;
  }

  async function creaRegola(applicazione: FastifyInstance) {
    return applicazione.inject({
      method: 'POST',
      url: '/api/regole',
      payload: {
        pattern: 'Esselunga',
        categoriaId: 'categoria-a',
        priority: 1,
      },
    });
  }

  it('normalizza il pattern quando crea una regola', async () => {
    const applicazione = creaApp();

    const response = await creaRegola(applicazione);

    expect(response.statusCode).toBe(201);
    expect(response.json().regola.pattern).toBe('esselunga');
  });

  it('rifiuta una categoria inesistente', async () => {
    const applicazione = creaApp();

    const response = await applicazione.inject({
      method: 'POST',
      url: '/api/regole',
      payload: { pattern: 'Esselunga', categoriaId: 'inesistente' },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().errore.codice).toBe('non_trovato');
  });

  it('elenca le regole create', async () => {
    const applicazione = creaApp();
    const creata = await creaRegola(applicazione);

    const response = await applicazione.inject({
      method: 'GET',
      url: '/api/regole',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().regole).toContainEqual(creata.json().regola);
  });

  it('aggiorna la priorita di una regola', async () => {
    const applicazione = creaApp();
    const creata = await creaRegola(applicazione);

    const response = await applicazione.inject({
      method: 'PATCH',
      url: `/api/regole/${creata.json().regola.id}`,
      payload: { priority: 5 },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().regola.priority).toBe(5);
  });

  it('elimina una regola', async () => {
    const applicazione = creaApp();
    const creata = await creaRegola(applicazione);
    const id = creata.json().regola.id;

    const eliminata = await applicazione.inject({
      method: 'DELETE',
      url: `/api/regole/${id}`,
    });
    const ottenuta = await applicazione.inject({
      method: 'GET',
      url: `/api/regole/${id}`,
    });

    expect(eliminata.statusCode).toBe(200);
    expect(ottenuta.statusCode).toBe(404);
  });
});
