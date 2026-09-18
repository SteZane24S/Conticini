import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { DataISO } from '@conticini/dominio';
import Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';

import { runMigrations } from '../migrations-runner.js';
import { inserisci, type ContestoScrittura } from '../scrittura.js';
import { creaRepositorioCicli } from './cicli.js';

describe('creaRepositorioCicli', () => {
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
    dir = mkdtempSync(path.join(tmpdir(), 'conticini-cicli-'));
    db = new Database(path.join(dir, 'conticini.db'));
    runMigrations(db);
    return { db, deviceId: 'device-test' };
  }

  function preparaDati(ctx: ContestoScrittura) {
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
  }

  it('crea, ottiene, elenca e aggiorna un ciclo', async () => {
    const ctx = creaContesto();
    preparaDati(ctx);
    const repo = creaRepositorioCicli(ctx);

    const creato = await repo.crea({
      startDate: '2026-02-10' as DataISO,
      expectedNextDate: '2026-03-10' as DataISO,
      expectedAmountCents: 250000,
      salaryTransactionId: 'movimento-stipendio',
    });
    const aggiornato = await repo.aggiorna(creato.id, {
      expectedNextDate: '2026-02-01' as DataISO,
      expectedAmountCents: 255000,
    });

    expect(await repo.ottieni(creato.id)).toEqual(aggiornato);
    expect(await repo.elenca()).toEqual([aggiornato]);
    expect(aggiornato).toMatchObject({
      startDate: '2026-02-10',
      expectedNextDate: '2026-02-01',
      expectedAmountCents: 255000,
      salaryTransactionId: 'movimento-stipendio',
    });
  });
});
