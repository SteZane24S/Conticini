import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import Database from 'better-sqlite3';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';

import { registraGestoreErrori } from '../errori.js';
import { runMigrations } from '../migrations-runner.js';
import { inserisci, type ContestoScrittura } from '../scrittura.js';
import { registraRotteCicli } from './cicli.js';

describe('rotte cicli', () => {
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
    dir = mkdtempSync(path.join(tmpdir(), 'conticini-rotte-cicli-'));
    db = new Database(path.join(dir, 'conticini.db'));
    runMigrations(db);
    const ctx: ContestoScrittura = { db, deviceId: 'device-test' };
    inserisci(ctx, 'accounts', 'accounts', 'conto-1', {
      name: 'Conto principale',
      initial_balance_cents: 0,
      opened_on: '2026-01-10',
      archived: 0,
    });
    inserisci(ctx, 'transactions', 'transactions', 'movimento-stipendio', {
      date: '2026-02-10',
      amount_cents: 250000,
      account_id: 'conto-1',
      category_id: null,
      description: 'Stipendio',
      description_norm: 'stipendio',
      transfer_group_id: null,
    });
    inserisci(ctx, 'salary_cycles', 'salary_cycles', 'ciclo-1', {
      salary_transaction_id: 'movimento-stipendio',
      start_date: '2026-02-10',
      expected_next_date: '2026-03-10',
      expected_amount_cents: 250000,
    });
    app = Fastify();
    registraGestoreErrori(app);
    registraRotteCicli(app, ctx);
    return app;
  }

  it('accetta una data prevista uguale o precedente alla data del ciclo', async () => {
    const applicazione = creaApp();

    const response = await applicazione.inject({
      method: 'PATCH',
      url: '/api/cicli/ciclo-1',
      payload: { expectedNextDate: '2026-02-01' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      ciclo: { expectedNextDate: '2026-02-01' },
    });
  });

  it('elenca i cicli', async () => {
    const applicazione = creaApp();

    const response = await applicazione.inject({
      method: 'GET',
      url: '/api/cicli',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().cicli).toContainEqual(
      expect.objectContaining({ id: 'ciclo-1' }),
    );
  });
});
