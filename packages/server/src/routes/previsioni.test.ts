import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import Database from 'better-sqlite3';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';

import { registraGestoreErrori } from '../errori.js';
import { runMigrations } from '../migrations-runner.js';
import { inserisci, type ContestoScrittura } from '../scrittura.js';
import { registraRottePrevisioni } from './previsioni.js';

describe('rotte previsioni', () => {
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

  function creaApp(conSpesaFissaAttiva = false): FastifyInstance {
    dir = mkdtempSync(path.join(tmpdir(), 'conticini-rotte-previsioni-'));
    db = new Database(path.join(dir, 'conticini.db'));
    runMigrations(db);
    const ctx: ContestoScrittura = { db, deviceId: 'device-test' };
    inserisci(ctx, 'sectors', 'sectors', 'settore-1', { name: 'Casa' });
    inserisci(ctx, 'categories', 'categories', 'categoria-uscita', {
      sector_id: 'settore-1',
      name: 'Spesa',
      kind: 'uscita',
    });
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
    if (conSpesaFissaAttiva) {
      inserisci(ctx, 'recurring_expenses', 'recurring_expenses', 'fissa-1', {
        name: 'Abbonamento',
        rule_type: 'monthly',
        interval: null,
        anchor_day: 5,
        anchor_month: null,
        start_date: '2026-01-05',
        end_date: null,
        amount_cents: 8500,
        account_id: 'conto-1',
        category_id: 'categoria-uscita',
        mode: 'manual',
        active: 1,
      });
    }
    app = Fastify();
    registraGestoreErrori(app);
    registraRottePrevisioni(app, ctx);
    return app;
  }

  it('imposta un budget di default e lo elenca', async () => {
    const applicazione = creaApp();

    const imposta = await applicazione.inject({
      method: 'PUT',
      url: '/api/previsioni/default/categoria-uscita',
      payload: { amountCents: 12500 },
    });
    const elenco = await applicazione.inject({
      method: 'GET',
      url: '/api/previsioni/default',
    });

    expect(imposta.statusCode).toBe(200);
    expect(elenco.json()).toMatchObject({
      ok: true,
      budgetDefaults: [{ categoriaId: 'categoria-uscita', amountCents: 12500 }],
    });
  });

  it('rifiuta un budget di default per una categoria con spesa fissa attiva', async () => {
    const response = await creaApp(true).inject({
      method: 'PUT',
      url: '/api/previsioni/default/categoria-uscita',
      payload: { amountCents: 12500 },
    });

    expect(response.statusCode).toBe(422);
    expect(response.json().errore.codice).toBe(
      'previsione_e_fissa_su_stessa_categoria',
    );
  });

  it('imposta un override dopo il budget di default', async () => {
    const applicazione = creaApp();
    await applicazione.inject({
      method: 'PUT',
      url: '/api/previsioni/default/categoria-uscita',
      payload: { amountCents: 12500 },
    });

    const response = await applicazione.inject({
      method: 'PUT',
      url: '/api/previsioni/override/ciclo-1/categoria-uscita',
      payload: { amountCents: 9000 },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      budgetOverride: {
        cicloId: 'ciclo-1',
        categoriaId: 'categoria-uscita',
        amountCents: 9000,
      },
    });
  });

  it('restituisce 404 per l override di un ciclo inesistente', async () => {
    const applicazione = creaApp();
    await applicazione.inject({
      method: 'PUT',
      url: '/api/previsioni/default/categoria-uscita',
      payload: { amountCents: 12500 },
    });

    const response = await applicazione.inject({
      method: 'PUT',
      url: '/api/previsioni/override/ciclo-inesistente/categoria-uscita',
      payload: { amountCents: 9000 },
    });

    expect(response.statusCode).toBe(404);
  });

  it('restituisce il budget di default e poi l override del ciclo', async () => {
    const applicazione = creaApp();
    await applicazione.inject({
      method: 'PUT',
      url: '/api/previsioni/default/categoria-uscita',
      payload: { amountCents: 12500 },
    });
    const prima = await applicazione.inject({
      method: 'GET',
      url: '/api/previsioni/ciclo/ciclo-1',
    });
    await applicazione.inject({
      method: 'PUT',
      url: '/api/previsioni/override/ciclo-1/categoria-uscita',
      payload: { amountCents: 9000 },
    });
    const dopo = await applicazione.inject({
      method: 'GET',
      url: '/api/previsioni/ciclo/ciclo-1',
    });

    expect(prima.json()).toMatchObject({
      ok: true,
      budget: [
        {
          categoriaId: 'categoria-uscita',
          amountCents: 12500,
          override: false,
        },
      ],
    });
    expect(dopo.json()).toMatchObject({
      ok: true,
      budget: [
        { categoriaId: 'categoria-uscita', amountCents: 9000, override: true },
      ],
    });
  });
});
