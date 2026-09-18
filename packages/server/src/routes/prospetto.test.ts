import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import Database from 'better-sqlite3';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';

import { registraGestoreErrori } from '../errori.js';
import { runMigrations } from '../migrations-runner.js';
import { inserisci, type ContestoScrittura } from '../scrittura.js';
import { registraRotteProspetto } from './prospetto.js';

describe('rotte prospetto', () => {
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
    dir = mkdtempSync(path.join(tmpdir(), 'conticini-rotte-prospetto-'));
    db = new Database(path.join(dir, 'conticini.db'));
    runMigrations(db);
    const ctx: ContestoScrittura = { db, deviceId: 'device-test' };
    inserisci(ctx, 'accounts', 'accounts', 'conto-a', {
      name: 'A',
      initial_balance_cents: 100000,
      opened_on: '2024-01-01',
      archived: 0,
    });
    inserisci(ctx, 'sectors', 'sectors', 'settore-1', { name: 'Varie' });
    inserisci(ctx, 'categories', 'categories', 'categoria-c1', {
      sector_id: 'settore-1',
      name: 'Spese',
      kind: 'uscita',
    });
    inserisci(ctx, 'transactions', 'transactions', 'movimento-stipendio', {
      date: '2024-01-01',
      amount_cents: 0,
      account_id: 'conto-a',
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
    inserisci(ctx, 'recurring_expenses', 'recurring_expenses', 'fissa-1', {
      name: 'Fissa',
      rule_type: 'monthly',
      interval: null,
      anchor_day: 15,
      anchor_month: null,
      start_date: '2024-01-01',
      end_date: null,
      amount_cents: 5000,
      account_id: 'conto-a',
      category_id: 'categoria-c1',
      mode: 'manual',
      active: 1,
    });
    app = Fastify();
    registraGestoreErrori(app);
    registraRotteProspetto(app, ctx);
    return { applicazione: app, ctx };
  }

  it('sottrae una fissa non pagata dal saldo previsto', async () => {
    const { applicazione, ctx } = creaApp();
    inserisci(ctx, 'recurring_occurrences', 'recurring_occurrences', 'occ-1', {
      recurring_id: 'fissa-1',
      period: '2024-01',
      due_date: '2024-01-15',
      amount_cents: 5000,
      account_id: 'conto-a',
      category_id: 'categoria-c1',
      mode: 'manual',
      status: 'pending',
      transaction_id: null,
    });

    const response = await applicazione.inject({
      method: 'GET',
      url: '/api/prospetto?data=2024-01-20',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().prospetto.saldoPrevistoCents).toBe(95000);
  });

  it('mantiene il saldo previsto quando una fissa e pagata', async () => {
    const { applicazione, ctx } = creaApp();
    inserisci(ctx, 'transactions', 'transactions', 'pagamento-fissa1', {
      date: '2024-01-15',
      amount_cents: -5000,
      account_id: 'conto-a',
      category_id: null,
      description: 'Pagamento fissa',
      description_norm: 'pagamento fissa',
      transfer_group_id: null,
    });
    inserisci(ctx, 'recurring_occurrences', 'recurring_occurrences', 'occ-2', {
      recurring_id: 'fissa-1',
      period: '2024-01',
      due_date: '2024-01-15',
      amount_cents: 5000,
      account_id: 'conto-a',
      category_id: 'categoria-c1',
      mode: 'manual',
      status: 'paid',
      transaction_id: 'pagamento-fissa1',
    });

    const response = await applicazione.inject({
      method: 'GET',
      url: '/api/prospetto?data=2024-01-20',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().prospetto.saldoPrevistoCents).toBe(95000);
  });

  it('mantiene una fissa pagata dopo D tra gli impegni', async () => {
    const { applicazione, ctx } = creaApp();
    inserisci(ctx, 'transactions', 'transactions', 'pagamento-fissa3', {
      date: '2024-01-25',
      amount_cents: -5000,
      account_id: 'conto-a',
      category_id: null,
      description: 'Pagamento fissa',
      description_norm: 'pagamento fissa',
      transfer_group_id: null,
    });
    inserisci(ctx, 'recurring_occurrences', 'recurring_occurrences', 'occ-3', {
      recurring_id: 'fissa-1',
      period: '2024-01',
      due_date: '2024-01-15',
      amount_cents: 5000,
      account_id: 'conto-a',
      category_id: 'categoria-c1',
      mode: 'manual',
      status: 'paid',
      transaction_id: 'pagamento-fissa3',
    });

    const response = await applicazione.inject({
      method: 'GET',
      url: '/api/prospetto?data=2024-01-20',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().prospetto.fisseAncoraDaPagare).toContainEqual(
      expect.objectContaining({ id: 'occ-3' }),
    );
  });

  it('calcola il residuo del budget della categoria', async () => {
    const { applicazione, ctx } = creaApp();
    inserisci(ctx, 'budget_defaults', 'budget_defaults', 'budget-c1', {
      category_id: 'categoria-c1',
      amount_cents: 10000,
    });
    inserisci(ctx, 'transactions', 'transactions', 'spesa-1', {
      date: '2024-01-10',
      amount_cents: -3000,
      account_id: 'conto-a',
      category_id: 'categoria-c1',
      description: 'Spesa',
      description_norm: 'spesa',
      transfer_group_id: null,
    });

    const response = await applicazione.inject({
      method: 'GET',
      url: '/api/prospetto?data=2024-01-20',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().prospetto.categorie).toContainEqual({
      categoriaId: 'categoria-c1',
      previstoCents: 10000,
      speseCents: 3000,
      residuoCents: 7000,
      sforamentoCents: 0,
    });
  });
});
