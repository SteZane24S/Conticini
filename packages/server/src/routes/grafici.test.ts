import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import Database from 'better-sqlite3';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';

import { registraGestoreErrori } from '../errori.js';
import { runMigrations } from '../migrations-runner.js';
import { inserisci, type ContestoScrittura } from '../scrittura.js';
import { registraRotteGrafici } from './grafici.js';

describe('rotte grafici', () => {
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

  function creaApp(): {
    applicazione: FastifyInstance;
    ctx: ContestoScrittura;
  } {
    dir = mkdtempSync(path.join(tmpdir(), 'conticini-rotte-grafici-'));
    db = new Database(path.join(dir, 'conticini.db'));
    runMigrations(db);
    const ctx: ContestoScrittura = { db, deviceId: 'device-test' };
    inserisci(ctx, 'accounts', 'accounts', 'conto-1', {
      name: 'Conto principale',
      initial_balance_cents: 100000,
      opened_on: '2024-01-01',
      archived: 0,
    });
    inserisci(ctx, 'sectors', 'sectors', 'settore-1', { name: 'Casa' });
    inserisci(ctx, 'categories', 'categories', 'categoria-1', {
      sector_id: 'settore-1',
      name: 'Spesa 1',
      kind: 'uscita',
    });
    inserisci(ctx, 'transactions', 'transactions', 'movimento-stipendio', {
      date: '2024-01-01',
      amount_cents: 0,
      account_id: 'conto-1',
      category_id: null,
      description: 'Stipendio',
      description_norm: 'stipendio',
      transfer_group_id: null,
    });
    inserisci(ctx, 'salary_cycles', 'salary_cycles', 'ciclo-1', {
      salary_transaction_id: 'movimento-stipendio',
      start_date: '2024-01-01',
      expected_next_date: '2024-02-01',
      expected_amount_cents: null,
    });
    app = Fastify();
    registraGestoreErrori(app);
    registraRotteGrafici(app, ctx);
    return { applicazione: app, ctx };
  }

  it('aggrega le spese del ciclo per settore ed esclude i trasferimenti', async () => {
    const { applicazione, ctx } = creaApp();
    inserisci(ctx, 'categories', 'categories', 'categoria-2', {
      sector_id: 'settore-1',
      name: 'Spesa 2',
      kind: 'uscita',
    });
    inserisci(ctx, 'transactions', 'transactions', 'spesa-1', {
      date: '2024-01-10',
      amount_cents: -3000,
      account_id: 'conto-1',
      category_id: 'categoria-1',
      description: 'Spesa 1',
      description_norm: 'spesa 1',
      transfer_group_id: null,
    });
    inserisci(ctx, 'transactions', 'transactions', 'spesa-2', {
      date: '2024-01-11',
      amount_cents: -2000,
      account_id: 'conto-1',
      category_id: 'categoria-2',
      description: 'Spesa 2',
      description_norm: 'spesa 2',
      transfer_group_id: null,
    });
    inserisci(ctx, 'transactions', 'transactions', 'trasferimento-1', {
      date: '2024-01-12',
      amount_cents: -9999,
      account_id: 'conto-1',
      category_id: 'categoria-1',
      description: 'Trasferimento',
      description_norm: 'trasferimento',
      transfer_group_id: 'gruppo-trasferimento',
    });

    const response = await applicazione.inject({
      method: 'GET',
      url: '/api/grafici/spese-per-settore?cicloId=ciclo-1',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().settori).toEqual([
      {
        settoreId: 'settore-1',
        speseCents: 5000,
        categorie: [
          { categoriaId: 'categoria-1', speseCents: 3000 },
          { categoriaId: 'categoria-2', speseCents: 2000 },
        ],
      },
    ]);
  });

  it('include il movimento nel giorno finale del periodo', async () => {
    const { applicazione, ctx } = creaApp();
    inserisci(ctx, 'transactions', 'transactions', 'spesa-finale', {
      date: '2024-01-10',
      amount_cents: -3000,
      account_id: 'conto-1',
      category_id: 'categoria-1',
      description: 'Spesa finale',
      description_norm: 'spesa finale',
      transfer_group_id: null,
    });

    const response = await applicazione.inject({
      method: 'GET',
      url: '/api/grafici/spese-per-settore?dataInizio=2024-01-01&dataFine=2024-01-10',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().settori[0].speseCents).toBe(3000);
  });

  it('restituisce 404 per un ciclo inesistente nelle spese per settore', async () => {
    const { applicazione } = creaApp();

    const response = await applicazione.inject({
      method: 'GET',
      url: '/api/grafici/spese-per-settore?cicloId=ciclo-inesistente',
    });

    expect(response.statusCode).toBe(404);
  });

  it('restituisce 400 senza una query valida per le spese per settore', async () => {
    const { applicazione } = creaApp();

    const response = await applicazione.inject({
      method: 'GET',
      url: '/api/grafici/spese-per-settore',
    });

    expect(response.statusCode).toBe(400);
  });

  it('restituisce i saldi per ogni giorno dell intervallo', async () => {
    const { applicazione, ctx } = creaApp();
    inserisci(ctx, 'transactions', 'transactions', 'spesa-saldo', {
      date: '2024-01-11',
      amount_cents: -3000,
      account_id: 'conto-1',
      category_id: 'categoria-1',
      description: 'Spesa saldo',
      description_norm: 'spesa saldo',
      transfer_group_id: null,
    });

    const response = await applicazione.inject({
      method: 'GET',
      url: '/api/grafici/saldo-giornaliero?dataInizio=2024-01-10&dataFine=2024-01-12',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().punti).toHaveLength(3);
    expect(response.json().punti[1]).toEqual({
      data: '2024-01-11',
      saldoCents: 97000,
    });
  });

  it('usa l override del ciclo nel grafico previsto-speso', async () => {
    const { applicazione, ctx } = creaApp();
    inserisci(ctx, 'budget_defaults', 'budget_defaults', 'budget-default-1', {
      category_id: 'categoria-1',
      amount_cents: 10000,
    });
    inserisci(
      ctx,
      'budget_overrides',
      'budget_overrides',
      'budget-override-1',
      {
        cycle_id: 'ciclo-1',
        category_id: 'categoria-1',
        amount_cents: 7000,
      },
    );

    const response = await applicazione.inject({
      method: 'GET',
      url: '/api/grafici/previsto-speso?cicloId=ciclo-1',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      cicloId: 'ciclo-1',
      previstoTotaleCents: 7000,
      speseTotaleCents: 0,
      categorie: [
        {
          categoriaId: 'categoria-1',
          previstoCents: 7000,
          speseCents: 0,
        },
      ],
    });
  });
});
