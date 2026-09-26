import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';

import { runMigrations } from '../migrations-runner.js';
import { inserisci, type ContestoScrittura } from '../scrittura.js';
import { elencaTrasferimenti, ottieniTrasferimento } from './trasferimenti.js';

describe('trasferimenti', () => {
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
    dir = mkdtempSync(path.join(tmpdir(), 'conticini-trasferimenti-'));
    db = new Database(path.join(dir, 'conticini.db'));
    runMigrations(db);
    const ctx = { db, deviceId: 'device-test' };
    inserisci(ctx, 'accounts', 'accounts', 'conto-1', {
      name: 'Conto principale',
      initial_balance_cents: 0,
      opened_on: '2026-01-10',
      archived: 0,
    });
    inserisci(ctx, 'accounts', 'accounts', 'conto-2', {
      name: 'Secondo conto',
      initial_balance_cents: 0,
      opened_on: '2026-02-01',
      archived: 0,
    });
    return ctx;
  }

  function inserisciTrasferimentoStorico(
    ctx: ContestoScrittura,
    gruppo: string,
    data = '2026-02-10',
  ): void {
    const inserisciRiga = ctx.db.prepare(`
      INSERT INTO transactions (
        id, created_at, updated_at, deleted_at, revision, base_revision,
        date, amount_cents, account_id, category_id, description, description_norm,
        transfer_group_id, linked_position_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const timestamp = '2026-01-01T00:00:00.000Z';

    inserisciRiga.run(
      `${gruppo}-origine`,
      timestamp,
      timestamp,
      null,
      'r1',
      null,
      data,
      -1200,
      'conto-1',
      null,
      'Giroconto storico',
      'giroconto storico',
      gruppo,
      null,
    );
    inserisciRiga.run(
      `${gruppo}-destinazione`,
      timestamp,
      timestamp,
      null,
      'r1',
      null,
      data,
      1200,
      'conto-2',
      null,
      'Giroconto storico',
      'giroconto storico',
      gruppo,
      null,
    );
  }

  it('ottiene solo gruppi validi e non include movimenti normali', () => {
    const ctx = creaContesto();
    inserisci(ctx, 'transactions', 'transactions', 'movimento-normale', {
      date: '2026-02-10',
      amount_cents: -100,
      account_id: 'conto-1',
      category_id: null,
      description: 'Normale',
      description_norm: 'normale',
      transfer_group_id: null,
    });
    inserisciTrasferimentoStorico(ctx, 'storico');

    expect(ottieniTrasferimento(ctx, 'inesistente')).toBeNull();
    expect(ottieniTrasferimento(ctx, 'storico')).toMatchObject({
      transferGroupId: 'storico',
      amountCents: 1200,
      contoOrigineId: 'conto-1',
      contoDestinazioneId: 'conto-2',
    });
  });

  it('elenca solo i gruppi validi dal piu recente', () => {
    const ctx = creaContesto();
    inserisciTrasferimentoStorico(ctx, 'precedente', '2026-02-10');
    inserisciTrasferimentoStorico(ctx, 'recente', '2026-03-01');
    inserisciTrasferimentoStorico(ctx, 'orfano');
    ctx.db
      .prepare('DELETE FROM transactions WHERE id = ?')
      .run('orfano-destinazione');

    expect(
      elencaTrasferimenti(ctx).map(
        (trasferimento) => trasferimento.transferGroupId,
      ),
    ).toEqual(['recente', 'precedente']);
  });
});
