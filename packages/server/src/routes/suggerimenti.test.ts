import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import Database from 'better-sqlite3';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';

import { registraGestoreErrori } from '../errori.js';
import { runMigrations } from '../migrations-runner.js';
import { inserisci, type ContestoScrittura } from '../scrittura.js';
import { registraRotteSuggerimenti } from './suggerimenti.js';

describe('rotte suggerimenti', () => {
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
    dir = mkdtempSync(path.join(tmpdir(), 'conticini-rotte-suggerimenti-'));
    db = new Database(path.join(dir, 'conticini.db'));
    runMigrations(db);
    const ctx: ContestoScrittura = { db, deviceId: 'device-test' };
    inserisci(ctx, 'accounts', 'accounts', 'conto-1', {
      name: 'Conto principale',
      initial_balance_cents: 0,
      opened_on: '2026-01-01',
      archived: 0,
    });
    inserisci(ctx, 'sectors', 'sectors', 'settore-1', { name: 'Spese' });
    inserisci(ctx, 'categories', 'categories', 'categoria-spesa', {
      sector_id: 'settore-1',
      name: 'Spesa',
      kind: 'uscita',
    });
    inserisci(ctx, 'transactions', 'transactions', 'movimento-1', {
      date: '2026-02-01',
      amount_cents: -5000,
      account_id: 'conto-1',
      category_id: 'categoria-spesa',
      description: 'Esselunga Milano',
      description_norm: 'esselunga milano',
      transfer_group_id: null,
    });
    inserisci(ctx, 'transactions', 'transactions', 'movimento-2', {
      date: '2026-02-02',
      amount_cents: -6000,
      account_id: 'conto-1',
      category_id: 'categoria-spesa',
      description: 'Esselunga Milano',
      description_norm: 'esselunga milano',
      transfer_group_id: null,
    });
    inserisci(ctx, 'transactions', 'transactions', 'movimento-3', {
      date: '2026-02-03',
      amount_cents: -7000,
      account_id: 'conto-1',
      category_id: null,
      description: 'Esselunga Roma',
      description_norm: 'esselunga roma',
      transfer_group_id: null,
    });
    app = Fastify();
    registraGestoreErrori(app);
    registraRotteSuggerimenti(app, ctx);
    return app;
  }

  it('suggerisce descrizioni per prefisso', async () => {
    const applicazione = creaApp();

    const response = await applicazione.inject({
      method: 'GET',
      url: '/api/suggerimenti?testo=esse',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().suggerimenti).toContainEqual(
      expect.objectContaining({
        descrizione: expect.stringMatching(/^Esselunga/i),
      }),
    );
  });

  it('propone la categoria della descrizione esatta piu frequente', async () => {
    const applicazione = creaApp();

    const response = await applicazione.inject({
      method: 'GET',
      url: '/api/suggerimenti?testo=esselunga%20milano',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().categoriaSuggerita).toBe('categoria-spesa');
  });

  it('richiede il testo di ricerca', async () => {
    const applicazione = creaApp();

    const response = await applicazione.inject({
      method: 'GET',
      url: '/api/suggerimenti',
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().errore.codice).toBe('richiesta_non_valida');
  });
});
