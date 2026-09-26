import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import Database from 'better-sqlite3';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';

import { registraGestoreErrori } from '../errori.js';
import { runMigrations } from '../migrations-runner.js';
import { inserisci, type ContestoScrittura } from '../scrittura.js';
import { registraRotteStipendi } from './stipendi.js';

describe('rotte stipendi', () => {
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
    dir = mkdtempSync(path.join(tmpdir(), 'conticini-rotte-stipendi-'));
    db = new Database(path.join(dir, 'conticini.db'));
    runMigrations(db);
    const ctx: ContestoScrittura = { db, deviceId: 'device-test' };
    inserisci(ctx, 'accounts', 'accounts', 'conto-1', {
      name: 'Conto principale',
      initial_balance_cents: 0,
      opened_on: '2026-01-10',
      archived: 0,
    });
    inserisci(ctx, 'sectors', 'sectors', 'settore-1', { name: 'Lavoro' });
    inserisci(ctx, 'categories', 'categories', 'categoria-entrata', {
      sector_id: 'settore-1',
      name: 'Stipendio',
      kind: 'entrata',
    });
    inserisci(ctx, 'categories', 'categories', 'categoria-uscita', {
      sector_id: 'settore-1',
      name: 'Spesa',
      kind: 'uscita',
    });
    app = Fastify();
    registraGestoreErrori(app);
    registraRotteStipendi(app, ctx);
    return app;
  }

  function payload(dati: Record<string, unknown> = {}) {
    return {
      data: '2026-02-10',
      amountCents: 250000,
      contoId: 'conto-1',
      categoriaId: 'categoria-entrata',
      descrizione: 'Stipendio febbraio',
      expectedNextDate: '2026-03-10',
      expectedAmountCents: 250000,
      ...dati,
    };
  }

  it('crea un movimento di stipendio e il relativo ciclo', async () => {
    const applicazione = creaApp();

    const response = await applicazione.inject({
      method: 'POST',
      url: '/api/stipendi',
      payload: payload(),
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      ok: true,
      movimento: {
        amountCents: 250000,
        contoId: null,
        transferGroupId: null,
      },
      ciclo: {
        startDate: '2026-02-10',
        salaryTransactionId: response.json().movimento.id,
      },
    });
  });

  it('restituisce gli errori per categoria non di entrata', async () => {
    const applicazione = creaApp();

    const categoria = await applicazione.inject({
      method: 'POST',
      url: '/api/stipendi',
      payload: payload({ categoriaId: 'categoria-uscita' }),
    });
    expect(categoria.statusCode).toBe(400);
    expect(categoria.json().errore).toMatchObject({
      codice: 'richiesta_non_valida',
      campo: 'categoriaId',
    });
  });
});
