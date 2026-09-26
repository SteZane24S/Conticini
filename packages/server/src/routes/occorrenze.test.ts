import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import Database from 'better-sqlite3';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';

import { registraGestoreErrori } from '../errori.js';
import { runMigrations } from '../migrations-runner.js';
import { inserisci, type ContestoScrittura } from '../scrittura.js';
import { registraRotteOccorrenze } from './occorrenze.js';

describe('rotte occorrenze', () => {
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
    dir = mkdtempSync(path.join(tmpdir(), 'conticini-rotte-occorrenze-'));
    db = new Database(path.join(dir, 'conticini.db'));
    runMigrations(db);
    const ctx: ContestoScrittura = { db, deviceId: 'device-test' };
    inserisci(ctx, 'accounts', 'accounts', 'conto-1', {
      name: 'Conto principale',
      initial_balance_cents: 0,
      opened_on: '2026-01-01',
      archived: 0,
    });
    inserisci(ctx, 'sectors', 'sectors', 'settore-1', { name: 'Casa' });
    inserisci(ctx, 'categories', 'categories', 'categoria-1', {
      sector_id: 'settore-1',
      name: 'Bollette',
      kind: 'uscita',
    });
    inserisci(ctx, 'recurring_expenses', 'recurring_expenses', 'ricorrenza-1', {
      name: 'Luce e gas',
      rule_type: 'monthly',
      interval: null,
      anchor_day: 5,
      anchor_month: null,
      start_date: '2026-01-05',
      end_date: null,
      amount_cents: 8500,
      account_id: null,
      category_id: 'categoria-1',
      mode: 'manual',
      active: 1,
    });
    inserisci(
      ctx,
      'recurring_occurrences',
      'recurring_occurrences',
      'pending-1',
      {
        recurring_id: 'ricorrenza-1',
        period: '2026-02',
        due_date: '2026-02-05',
        amount_cents: 8500,
        account_id: null,
        category_id: 'categoria-1',
        mode: 'manual',
        status: 'pending',
        transaction_id: null,
      },
    );
    app = Fastify();
    registraGestoreErrori(app);
    registraRotteOccorrenze(app, ctx);
    return app;
  }

  it('elenca le occorrenze pending e conferma con un body vuoto', async () => {
    const applicazione = creaApp();

    const elenco = await applicazione.inject({
      method: 'GET',
      url: '/api/occorrenze',
    });
    const conferma = await applicazione.inject({
      method: 'POST',
      url: '/api/occorrenze/pending-1/conferma',
      payload: {},
    });

    expect(elenco.json()).toMatchObject({
      ok: true,
      occorrenze: [{ id: 'pending-1', stato: 'pending', contoId: null }],
    });
    expect(conferma.statusCode).toBe(200);
    expect(conferma.json()).toMatchObject({
      ok: true,
      occorrenza: {
        id: 'pending-1',
        stato: 'paid',
        contoId: null,
        movimentoCollegato: { data: '2026-02-05' },
      },
    });
  });

  it('elenca tutte le occorrenze quando richiesto', async () => {
    const applicazione = creaApp();
    await applicazione.inject({
      method: 'POST',
      url: '/api/occorrenze/pending-1/salta',
    });

    const tutte = await applicazione.inject({
      method: 'GET',
      url: '/api/occorrenze?tutte=true',
    });
    const pending = await applicazione.inject({
      method: 'GET',
      url: '/api/occorrenze',
    });

    expect(tutte.json()).toMatchObject({
      ok: true,
      occorrenze: [{ id: 'pending-1', stato: 'skipped' }],
    });
    expect(pending.json()).toMatchObject({ ok: true, occorrenze: [] });
  });

  it('salta un occorrenza pending', async () => {
    const response = await creaApp().inject({
      method: 'POST',
      url: '/api/occorrenze/pending-1/salta',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      occorrenza: { stato: 'skipped' },
    });
  });

  it('valida il collegamento e restituisce il movimento inesistente', async () => {
    const applicazione = creaApp();
    const nonValido = await applicazione.inject({
      method: 'POST',
      url: '/api/occorrenze/pending-1/collega',
      payload: {},
    });
    const inesistente = await applicazione.inject({
      method: 'POST',
      url: '/api/occorrenze/pending-1/collega',
      payload: { movimentoId: 'inesistente' },
    });

    expect(nonValido.statusCode).toBe(400);
    expect(inesistente.statusCode).toBe(404);
    expect(inesistente.json().errore.codice).toBe('non_trovato');
  });
});
