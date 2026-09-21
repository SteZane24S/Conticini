import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';

import { ensureMeta } from './meta.js';
import { runMigrations } from './migrations-runner.js';

describe('migrazioni e meta', () => {
  let dir: string | undefined;
  let temporaryMigration: string | undefined;

  afterEach(() => {
    if (temporaryMigration) {
      rmSync(temporaryMigration, { force: true });
      temporaryMigration = undefined;
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
    expect(count.count).toBe(3);
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
    expect(first.schemaVersion).toBe(3);
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

    expect(second.schemaVersion).toBe(4);
    expect(second.datasetId).toBe(first.datasetId);
    expect(second.deviceId).toBe(first.deviceId);
  });
});
