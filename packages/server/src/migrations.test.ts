import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';
import {
  parseDataISO,
  saldiPerConto,
  totaleSenzaAncore,
  type Conto,
  type Movimento,
} from '@conticini/dominio';

import { ensureMeta } from './meta.js';
import { runMigrations } from './migrations-runner.js';

describe('migrazioni e meta', () => {
  let dir: string | undefined;
  let temporaryMigration: string | undefined;
  let cartellaMigrazioniTemp: string | undefined;

  afterEach(() => {
    if (temporaryMigration) {
      rmSync(temporaryMigration, { force: true });
      temporaryMigration = undefined;
    }
    if (cartellaMigrazioniTemp) {
      rmSync(cartellaMigrazioniTemp, { recursive: true, force: true });
      cartellaMigrazioniTemp = undefined;
    }
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
      dir = undefined;
    }
  });

  it('applicare le migrazioni due volte sullo stesso file è idempotente', () => {
    dir = mkdtempSync(path.join(tmpdir(), 'conticini-migrazioni-'));
    const dbPath = path.join(dir, 'conticini.db');

    const db1 = new Database(dbPath);
    runMigrations(db1);
    db1.close();

    const db2 = new Database(dbPath);
    expect(() => runMigrations(db2)).not.toThrow();
    const count = db2
      .prepare('SELECT COUNT(*) as count FROM schema_migrations')
      .get() as {
      count: number;
    };
    expect(count.count).toBe(4);
    db2.close();
  });

  it('meta resta stabile fra riavvii sullo stesso file', () => {
    dir = mkdtempSync(path.join(tmpdir(), 'conticini-meta-'));
    const dbPath = path.join(dir, 'conticini.db');

    const db1 = new Database(dbPath);
    runMigrations(db1);
    const first = ensureMeta(db1);
    db1.close();

    const db2 = new Database(dbPath);
    runMigrations(db2);
    const second = ensureMeta(db2);
    db2.close();

    expect(second).toEqual(first);
  });

  it('aggiorna la versione dello schema mantenendo gli identificativi del meta', () => {
    dir = mkdtempSync(path.join(tmpdir(), 'conticini-meta-migrazione-'));
    const dbPath = path.join(dir, 'conticini.db');

    const db1 = new Database(dbPath);
    runMigrations(db1);
    const first = ensureMeta(db1);
    expect(first.schemaVersion).toBe(4);
    db1.close();

    temporaryMigration = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      '../migrations/999-test-temporanea.sql',
    );
    writeFileSync(
      temporaryMigration,
      'CREATE TABLE IF NOT EXISTS _test_temp (id INTEGER);',
      'utf8',
    );

    const db2 = new Database(dbPath);
    runMigrations(db2);
    const second = ensureMeta(db2);
    db2.close();

    expect(second.schemaVersion).toBe(5);
    expect(second.datasetId).toBe(first.datasetId);
    expect(second.deviceId).toBe(first.deviceId);
  });

  it('applica una migrazione di ricostruzione e riattiva le chiavi esterne', () => {
    dir = mkdtempSync(path.join(tmpdir(), 'conticini-migrazioni-'));
    cartellaMigrazioniTemp = mkdtempSync(
      path.join(tmpdir(), 'conticini-migrazioni-tmp-'),
    );
    writeFileSync(
      path.join(cartellaMigrazioniTemp, '999-test-temporanea.sql'),
      '-- ricostruzione-tabelle\nCREATE TABLE IF NOT EXISTS _test_ricostruzione (id INTEGER);',
      'utf8',
    );

    const db = new Database(path.join(dir, 'conticini.db'));
    runMigrations(db, cartellaMigrazioniTemp);

    expect(
      db
        .prepare('SELECT name FROM schema_migrations WHERE name = ?')
        .get('999-test-temporanea.sql'),
    ).toEqual({ name: '999-test-temporanea.sql' });
    expect(db.pragma('foreign_keys', { simple: true })).toBe(1);
    db.close();
  });

  it('annulla una migrazione di ricostruzione con violazioni referenziali', () => {
    dir = mkdtempSync(path.join(tmpdir(), 'conticini-migrazioni-'));
    cartellaMigrazioniTemp = mkdtempSync(
      path.join(tmpdir(), 'conticini-migrazioni-tmp-'),
    );
    writeFileSync(
      path.join(cartellaMigrazioniTemp, '999-test-temporanea.sql'),
      [
        '-- ricostruzione-tabelle',
        'CREATE TABLE _test_fk_figlio (id INTEGER PRIMARY KEY, padre_id INTEGER REFERENCES _test_fk_padre(id));',
        'INSERT INTO _test_fk_figlio (id, padre_id) VALUES (1, 1);',
      ].join('\n'),
      'utf8',
    );

    const db = new Database(path.join(dir, 'conticini.db'));

    expect(() => runMigrations(db, cartellaMigrazioniTemp)).toThrow(
      '999-test-temporanea.sql',
    );
    expect(
      db
        .prepare('SELECT name FROM schema_migrations WHERE name = ?')
        .get('999-test-temporanea.sql'),
    ).toBeUndefined();
    db.close();
  });

  it('mantiene saldi e movimenti applicando la migrazione 003', () => {
    dir = mkdtempSync(path.join(tmpdir(), 'conticini-migrazioni-'));
    const db = new Database(path.join(dir, 'conticini.db'));
    const migrationsPath = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      '../migrations',
    );

    db.exec(
      'CREATE TABLE schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)',
    );
    for (const file of [
      '000-meta.sql',
      '001-schema.sql',
      '002-debiti-crediti.sql',
    ]) {
      db.exec(readFileSync(path.join(migrationsPath, file), 'utf8'));
      db.prepare(
        'INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)',
      ).run(file, new Date().toISOString());
    }

    db.exec(`
      INSERT INTO sectors (id, created_at, updated_at, deleted_at, revision, base_revision, name)
      VALUES ('settore', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', NULL, 'r1', NULL, 'Spese');
      INSERT INTO categories (id, created_at, updated_at, deleted_at, revision, base_revision, sector_id, name, kind)
      VALUES ('categoria', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', NULL, 'r1', NULL, 'settore', 'Casa', 'uscita');
      INSERT INTO accounts (id, created_at, updated_at, deleted_at, revision, base_revision, name, initial_balance_cents, opened_on, archived)
      VALUES
        ('conto-a', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', NULL, 'r1', NULL, 'Conto A', 10000, '2026-01-01', 0),
        ('conto-b', '2026-03-01T00:00:00.000Z', '2026-03-01T00:00:00.000Z', NULL, 'r1', NULL, 'Conto B', 5000, '2026-03-01', 0);
      INSERT INTO transactions (id, created_at, updated_at, deleted_at, revision, base_revision, date, amount_cents, account_id, category_id, description, description_norm, transfer_group_id, linked_position_id)
      VALUES
        ('movimento-1', '2026-01-10T00:00:00.000Z', '2026-01-10T00:00:00.000Z', NULL, 'r1', NULL, '2026-01-10', 1500, 'conto-a', NULL, 'Entrata', 'entrata', NULL, NULL),
        ('movimento-2', '2026-02-10T00:00:00.000Z', '2026-02-10T00:00:00.000Z', NULL, 'r1', NULL, '2026-02-10', -2000, 'conto-a', 'categoria', 'Spesa', 'spesa', NULL, NULL),
        ('movimento-3', '2026-03-10T00:00:00.000Z', '2026-03-10T00:00:00.000Z', NULL, 'r1', NULL, '2026-03-10', 4000, 'conto-b', NULL, 'Entrata B', 'entrata b', NULL, NULL);
      INSERT INTO recurring_expenses (id, created_at, updated_at, deleted_at, revision, base_revision, name, rule_type, interval, anchor_day, anchor_month, start_date, end_date, amount_cents, account_id, category_id, mode, active)
      VALUES ('fissa', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', NULL, 'r1', NULL, 'Affitto', 'monthly', NULL, 1, NULL, '2026-01-01', NULL, -700, 'conto-a', 'categoria', 'manual', 1);
      INSERT INTO recurring_occurrences (id, created_at, updated_at, deleted_at, revision, base_revision, recurring_id, period, due_date, amount_cents, account_id, category_id, mode, status, transaction_id)
      VALUES ('occorrenza', '2026-02-01T00:00:00.000Z', '2026-02-01T00:00:00.000Z', NULL, 'r1', NULL, 'fissa', '2026-02', '2026-02-01', -700, 'conto-a', 'categoria', 'manual', 'pending', NULL);
    `);

    const calcolaSaldi = () => {
      const conti = db
        .prepare('SELECT id, initial_balance_cents, opened_on FROM accounts')
        .all()
        .map((row) => {
          const conto = row as {
            id: string;
            initial_balance_cents: number;
            opened_on: string;
          };
          return {
            id: conto.id,
            saldoInizialeCents: conto.initial_balance_cents,
            dataApertura: parseDataISO(conto.opened_on),
          } satisfies Conto;
        });
      const movimenti = db
        .prepare(
          'SELECT id, date, amount_cents, account_id, category_id, transfer_group_id, linked_position_id FROM transactions',
        )
        .all()
        .map((row) => {
          const movimento = row as {
            id: string;
            date: string;
            amount_cents: number;
            account_id: string | null;
            category_id: string | null;
            transfer_group_id: string | null;
            linked_position_id: string | null;
          };
          return {
            id: movimento.id,
            data: parseDataISO(movimento.date),
            amountCents: movimento.amount_cents,
            contoId: movimento.account_id,
            categoriaId: movimento.category_id,
            transferGroupId: movimento.transfer_group_id,
            posizioneId: movimento.linked_position_id,
          } satisfies Movimento;
        });
      return ['2026-02-20', '2026-03-01', '2026-03-20'].map((data) => {
        const dataISO = parseDataISO(data);
        return {
          totale: totaleSenzaAncore(dataISO, conti, movimenti),
          saldi: saldiPerConto(dataISO, conti, movimenti),
        };
      });
    };

    const prima = calcolaSaldi();
    runMigrations(db);

    expect(calcolaSaldi()).toEqual(prima);
    expect(db.pragma('foreign_key_check')).toEqual([]);
    for (const table of [
      'account_readings',
      'total_anchors',
      'total_anchor_covered_transactions',
    ]) {
      expect(
        (
          db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get() as {
            count: number;
          }
        ).count,
      ).toBe(0);
    }
    db.close();
  });
});
