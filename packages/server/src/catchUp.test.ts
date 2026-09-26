import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { DataISO } from '@conticini/dominio';
import Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';

import { runMigrations } from './migrations-runner.js';
import { aggiorna, inserisci, type ContestoScrittura } from './scrittura.js';
import { eseguiCatchUp } from './catchUp.js';

interface DatiSpesaFissa {
  id: string;
  name: string;
  ruleType: 'monthly' | 'every_n_months' | 'yearly';
  interval: number | null;
  anchorDay: number;
  anchorMonth: number | null;
  startDate: DataISO;
  endDate: DataISO | null;
  amountCents: number;
  mode: 'auto' | 'manual';
}

describe('eseguiCatchUp', () => {
  let dir: string | undefined;
  let db: Database.Database | undefined;

  afterEach(() => {
    db?.close();
    db = undefined;
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
      dir = undefined;
    }
  });

  function creaContesto(): ContestoScrittura {
    dir = mkdtempSync(path.join(tmpdir(), 'conticini-catch-up-'));
    db = new Database(path.join(dir, 'conticini.db'));
    runMigrations(db);
    return { db, deviceId: 'device-test' };
  }

  function preparaDati(ctx: ContestoScrittura): void {
    inserisci(ctx, 'accounts', 'accounts', 'conto-1', {
      name: 'Conto principale',
      initial_balance_cents: 0,
      opened_on: '2025-01-01',
      archived: 0,
    });
    inserisci(ctx, 'sectors', 'sectors', 'settore-1', { name: 'Casa' });
    inserisci(ctx, 'categories', 'categories', 'categoria-uscita', {
      sector_id: 'settore-1',
      name: 'Spesa',
      kind: 'uscita',
    });
  }

  function inserisciSpesaFissa(
    ctx: ContestoScrittura,
    dati: Partial<DatiSpesaFissa> = {},
  ): void {
    const spesaFissa: DatiSpesaFissa = {
      id: 'spesa-fissa-1',
      name: 'Affitto',
      ruleType: 'monthly',
      interval: null,
      anchorDay: 5,
      anchorMonth: null,
      startDate: '2026-01-01' as DataISO,
      endDate: null,
      amountCents: 75000,
      mode: 'auto',
      ...dati,
    };
    inserisci(ctx, 'recurring_expenses', 'recurring_expenses', spesaFissa.id, {
      name: spesaFissa.name,
      rule_type: spesaFissa.ruleType,
      interval: spesaFissa.interval,
      anchor_day: spesaFissa.anchorDay,
      anchor_month: spesaFissa.anchorMonth,
      start_date: spesaFissa.startDate,
      end_date: spesaFissa.endDate,
      amount_cents: spesaFissa.amountCents,
      account_id: 'conto-1',
      category_id: 'categoria-uscita',
      mode: spesaFissa.mode,
      active: 1,
    });
  }

  it('non crea righe o change log duplicati al secondo catch-up', () => {
    const ctx = creaContesto();
    preparaDati(ctx);
    inserisciSpesaFissa(ctx);

    eseguiCatchUp(ctx, '2026-03-20' as DataISO, 0);
    const dopoPrimo = {
      occorrenze: ctx.db
        .prepare('SELECT COUNT(*) AS totale FROM recurring_occurrences')
        .get() as { totale: number },
      movimenti: ctx.db
        .prepare('SELECT COUNT(*) AS totale FROM transactions')
        .get() as { totale: number },
      log: ctx.db
        .prepare('SELECT COUNT(*) AS totale FROM change_log')
        .get() as { totale: number },
    };

    eseguiCatchUp(ctx, '2026-03-20' as DataISO, 0);
    const dopoSecondo = {
      occorrenze: ctx.db
        .prepare('SELECT COUNT(*) AS totale FROM recurring_occurrences')
        .get() as { totale: number },
      movimenti: ctx.db
        .prepare('SELECT COUNT(*) AS totale FROM transactions')
        .get() as { totale: number },
      log: ctx.db
        .prepare('SELECT COUNT(*) AS totale FROM change_log')
        .get() as { totale: number },
    };

    expect(dopoPrimo.occorrenze.totale).toBe(3);
    expect(dopoPrimo.movimenti.totale).toBe(3);
    expect(dopoSecondo).toEqual(dopoPrimo);
  });

  it('materializza le occorrenze auto arretrate con movimenti datati alla scadenza', () => {
    const ctx = creaContesto();
    preparaDati(ctx);
    inserisciSpesaFissa(ctx, {
      startDate: '2025-11-01' as DataISO,
    });

    eseguiCatchUp(ctx, '2026-02-20' as DataISO, 0);

    expect(
      ctx.db
        .prepare(
          'SELECT recurring_occurrences.due_date, recurring_occurrences.status, recurring_occurrences.account_id AS occurrence_account_id, transactions.date AS transaction_date, transactions.account_id AS transaction_account_id FROM recurring_occurrences JOIN transactions ON transactions.id = recurring_occurrences.transaction_id ORDER BY recurring_occurrences.due_date',
        )
        .all(),
    ).toEqual([
      {
        due_date: '2025-11-05',
        status: 'paid',
        occurrence_account_id: null,
        transaction_date: '2025-11-05',
        transaction_account_id: null,
      },
      {
        due_date: '2025-12-05',
        status: 'paid',
        occurrence_account_id: null,
        transaction_date: '2025-12-05',
        transaction_account_id: null,
      },
      {
        due_date: '2026-01-05',
        status: 'paid',
        occurrence_account_id: null,
        transaction_date: '2026-01-05',
        transaction_account_id: null,
      },
      {
        due_date: '2026-02-05',
        status: 'paid',
        occurrence_account_id: null,
        transaction_date: '2026-02-05',
        transaction_account_id: null,
      },
    ]);
  });

  it('lascia pending unoccorrenza manuale gia scaduta senza creare il movimento', () => {
    const ctx = creaContesto();
    preparaDati(ctx);
    inserisciSpesaFissa(ctx, {
      mode: 'manual',
      endDate: '2026-01-31' as DataISO,
    });

    eseguiCatchUp(ctx, '2026-02-10' as DataISO, 0);

    expect(
      ctx.db
        .prepare(
          'SELECT due_date, status, transaction_id, account_id FROM recurring_occurrences',
        )
        .all(),
    ).toEqual([
      {
        due_date: '2026-01-05',
        status: 'pending',
        transaction_id: null,
        account_id: null,
      },
    ]);
    expect(
      ctx.db.prepare('SELECT COUNT(*) AS totale FROM transactions').get(),
    ).toEqual({ totale: 0 });
  });

  it('lascia pending le occorrenze future sia auto sia manuali', () => {
    const ctx = creaContesto();
    preparaDati(ctx);
    inserisciSpesaFissa(ctx, {
      id: 'spesa-fissa-auto',
      startDate: '2026-03-01' as DataISO,
      mode: 'auto',
    });
    inserisciSpesaFissa(ctx, {
      id: 'spesa-fissa-manuale',
      startDate: '2026-03-01' as DataISO,
      mode: 'manual',
    });

    eseguiCatchUp(ctx, '2026-02-01' as DataISO, 40);

    expect(
      ctx.db
        .prepare(
          'SELECT mode, status, transaction_id, account_id FROM recurring_occurrences ORDER BY mode',
        )
        .all(),
    ).toEqual([
      {
        mode: 'auto',
        status: 'pending',
        transaction_id: null,
        account_id: null,
      },
      {
        mode: 'manual',
        status: 'pending',
        transaction_id: null,
        account_id: null,
      },
    ]);
    expect(
      ctx.db.prepare('SELECT COUNT(*) AS totale FROM transactions').get(),
    ).toEqual({ totale: 0 });
  });

  it('promuove a pagata un’occorrenza auto pending quando la scadenza arriva in un catch-up successivo', () => {
    const ctx = creaContesto();
    preparaDati(ctx);
    inserisciSpesaFissa(ctx, {
      id: 'spesa-fissa-auto',
      startDate: '2026-03-01' as DataISO,
      mode: 'auto',
    });

    eseguiCatchUp(ctx, '2026-02-01' as DataISO, 40);
    eseguiCatchUp(ctx, '2026-03-10' as DataISO, 40);

    expect(
      ctx.db
        .prepare(
          'SELECT recurring_occurrences.status, recurring_occurrences.transaction_id, recurring_occurrences.account_id AS occurrence_account_id, transactions.date AS transaction_date, transactions.amount_cents AS transaction_amount_cents, transactions.account_id AS transaction_account_id FROM recurring_occurrences JOIN transactions ON transactions.id = recurring_occurrences.transaction_id WHERE recurring_occurrences.due_date = ?',
        )
        .get('2026-03-05'),
    ).toEqual({
      status: 'paid',
      transaction_id: expect.any(String),
      occurrence_account_id: null,
      transaction_date: '2026-03-05',
      transaction_amount_cents: -75000,
      transaction_account_id: null,
    });
  });

  it('aggiorna la scadenza di un’occorrenza auto pending quando cambia nello stesso periodo', () => {
    const ctx = creaContesto();
    preparaDati(ctx);
    inserisciSpesaFissa(ctx, {
      id: 'spesa-fissa-auto',
      startDate: '2026-03-01' as DataISO,
      anchorDay: 5,
      mode: 'auto',
    });

    eseguiCatchUp(ctx, '2026-02-01' as DataISO, 40);
    const spesaFissa = ctx.db
      .prepare('SELECT revision FROM recurring_expenses WHERE id = ?')
      .get('spesa-fissa-auto') as { revision: string };
    aggiorna(
      ctx,
      'recurring_expenses',
      'recurring_expenses',
      'spesa-fissa-auto',
      { anchor_day: 10 },
      spesaFissa.revision,
    );

    eseguiCatchUp(ctx, '2026-03-11' as DataISO, 40);

    expect(
      ctx.db
        .prepare(
          'SELECT recurring_occurrences.status, recurring_occurrences.due_date, recurring_occurrences.transaction_id, recurring_occurrences.account_id AS occurrence_account_id, transactions.date AS transaction_date, transactions.amount_cents AS transaction_amount_cents, transactions.account_id AS transaction_account_id FROM recurring_occurrences JOIN transactions ON transactions.id = recurring_occurrences.transaction_id WHERE recurring_occurrences.recurring_id = ? AND recurring_occurrences.period = ?',
        )
        .get('spesa-fissa-auto', '2026-03'),
    ).toEqual({
      status: 'paid',
      due_date: '2026-03-10',
      transaction_id: expect.any(String),
      occurrence_account_id: null,
      transaction_date: '2026-03-10',
      transaction_amount_cents: -75000,
      transaction_account_id: null,
    });
  });
});
