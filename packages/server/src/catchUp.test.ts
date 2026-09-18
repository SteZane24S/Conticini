import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { DataISO } from '@conticini/dominio';
import Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';

import { runMigrations } from './migrations-runner.js';
import { inserisci, type ContestoScrittura } from './scrittura.js';
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
          'SELECT recurring_occurrences.due_date, recurring_occurrences.status, transactions.date AS transaction_date FROM recurring_occurrences JOIN transactions ON transactions.id = recurring_occurrences.transaction_id ORDER BY recurring_occurrences.due_date',
        )
        .all(),
    ).toEqual([
      {
        due_date: '2025-11-05',
        status: 'paid',
        transaction_date: '2025-11-05',
      },
      {
        due_date: '2025-12-05',
        status: 'paid',
        transaction_date: '2025-12-05',
      },
      {
        due_date: '2026-01-05',
        status: 'paid',
        transaction_date: '2026-01-05',
      },
      {
        due_date: '2026-02-05',
        status: 'paid',
        transaction_date: '2026-02-05',
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
          'SELECT due_date, status, transaction_id FROM recurring_occurrences',
        )
        .all(),
    ).toEqual([
      { due_date: '2026-01-05', status: 'pending', transaction_id: null },
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
          'SELECT mode, status, transaction_id FROM recurring_occurrences ORDER BY mode',
        )
        .all(),
    ).toEqual([
      { mode: 'auto', status: 'pending', transaction_id: null },
      { mode: 'manual', status: 'pending', transaction_id: null },
    ]);
    expect(
      ctx.db.prepare('SELECT COUNT(*) AS totale FROM transactions').get(),
    ).toEqual({ totale: 0 });
  });
});
