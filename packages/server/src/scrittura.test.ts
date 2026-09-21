import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';

import { runMigrations } from './migrations-runner.js';
import { aggiorna, cancella, inserisci, SOLO_ATTIVI } from './scrittura.js';

describe('scrittura centrale', () => {
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

  function apriDatabase(): Database.Database {
    dir = mkdtempSync(path.join(tmpdir(), 'conticini-scrittura-'));
    const database = new Database(path.join(dir, 'conticini.db'));
    runMigrations(database);
    db = database;
    return database;
  }

  it('ogni scrittura produce una riga in change_log', () => {
    const database = apriDatabase();
    const ctx = { db: database, deviceId: 'device-test' };
    const id = 'account-test';

    const inserted = inserisci(ctx, 'accounts', 'accounts', id, {
      name: 'Conto test',
      initial_balance_cents: 1000,
      opened_on: '2026-01-01',
      archived: 0,
    });

    const firstLog = database
      .prepare(
        'SELECT entity, entity_id, revision, base_revision FROM change_log',
      )
      .get() as {
      entity: string;
      entity_id: string;
      revision: string;
      base_revision: string | null;
    };
    expect(firstLog.entity).toBe('accounts');
    expect(firstLog.entity_id).toBe(id);
    expect(firstLog.revision).toBe(inserted.revision);
    expect(firstLog.base_revision).toBeNull();

    const updated = aggiorna(
      ctx,
      'accounts',
      'accounts',
      id,
      { name: 'Conto rinominato' },
      inserted.revision,
    );

    const count = database
      .prepare('SELECT COUNT(*) as count FROM change_log')
      .get() as { count: number };
    expect(count.count).toBe(2);

    const secondLog = database
      .prepare(
        'SELECT base_revision, revision FROM change_log ORDER BY created_at, rowid LIMIT 1 OFFSET 1',
      )
      .get() as { base_revision: string | null; revision: string };
    expect(secondLog.base_revision).toBe(inserted.revision);
    expect(secondLog.revision).toBe(updated.revision);
  });

  it('rifiuta colonne riservate in inserisci', () => {
    const database = apriDatabase();
    const ctx = { db: database, deviceId: 'device-test' };

    expect(() =>
      inserisci(ctx, 'accounts', 'accounts', 'account-test', {
        id: 'id-sovrascritto',
        name: 'Conto test',
        initial_balance_cents: 1000,
        opened_on: '2026-01-01',
        archived: 0,
      }),
    ).toThrow();
  });

  it('rifiuta colonne riservate in aggiorna', () => {
    const database = apriDatabase();
    const ctx = { db: database, deviceId: 'device-test' };

    expect(() =>
      aggiorna(
        ctx,
        'accounts',
        'accounts',
        'account-test',
        { id: 'id-sovrascritto' },
        'base-revision',
      ),
    ).toThrow();
  });

  it('rifiuta aggiorna su un id inesistente senza scrivere il log', () => {
    const database = apriDatabase();
    const ctx = { db: database, deviceId: 'device-test' };

    expect(() =>
      aggiorna(
        ctx,
        'accounts',
        'accounts',
        'account-inesistente',
        { name: 'Conto aggiornato' },
        'base-revision',
      ),
    ).toThrow();

    const logCount = database
      .prepare(
        "SELECT COUNT(*) as count FROM change_log WHERE entity = 'accounts'",
      )
      .get() as { count: number };
    expect(logCount.count).toBe(0);
  });

  it('rifiuta cancella su un id inesistente senza scrivere il log', () => {
    const database = apriDatabase();
    const ctx = { db: database, deviceId: 'device-test' };

    expect(() =>
      cancella(
        ctx,
        'accounts',
        'accounts',
        'account-inesistente',
        'base-revision',
      ),
    ).toThrow();

    const logCount = database
      .prepare(
        "SELECT COUNT(*) as count FROM change_log WHERE entity = 'accounts'",
      )
      .get() as { count: number };
    expect(logCount.count).toBe(0);
  });

  it('un rollback non lascia né la riga né il log', () => {
    const database = apriDatabase();
    const ctx = { db: database, deviceId: 'device-test' };
    const sectorId = 'sector-test';

    inserisci(ctx, 'sectors', 'sectors', sectorId, { name: 'Settore test' });

    expect(() =>
      inserisci(ctx, 'categories', 'categories', 'category-test', {
        sector_id: sectorId,
        name: 'Categoria test',
        kind: 'bogus',
      }),
    ).toThrow();

    const categoryCount = database
      .prepare('SELECT COUNT(*) as count FROM categories')
      .get() as { count: number };
    expect(categoryCount.count).toBe(2);

    const logCount = database
      .prepare(
        "SELECT COUNT(*) as count FROM change_log WHERE entity = 'categories'",
      )
      .get() as { count: number };
    expect(logCount.count).toBe(0);
  });

  it('dopo una cancellazione, la riga resta con deleted_at valorizzato', () => {
    const database = apriDatabase();
    const ctx = { db: database, deviceId: 'device-test' };
    const id = 'account-da-cancellare';

    const inserted = inserisci(ctx, 'accounts', 'accounts', id, {
      name: 'Conto da cancellare',
      initial_balance_cents: 0,
      opened_on: '2026-01-01',
      archived: 0,
    });

    cancella(ctx, 'accounts', 'accounts', id, inserted.revision);

    const count = database
      .prepare('SELECT COUNT(*) as count FROM accounts')
      .get() as { count: number };
    expect(count.count).toBe(1);

    const row = database
      .prepare('SELECT deleted_at FROM accounts WHERE id = ?')
      .get(id) as { deleted_at: string | null };
    expect(row.deleted_at).not.toBeNull();

    const activeCount = database
      .prepare(`SELECT COUNT(*) as count FROM accounts WHERE ${SOLO_ATTIVI}`)
      .get() as { count: number };
    expect(activeCount.count).toBe(0);
  });
});
