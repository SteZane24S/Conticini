import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';

import {
  ErroreBackupNonValido,
  applicaRotazione,
  cartellaBackupDefault,
  elencaBackup,
  eseguiBackup,
  leggiImpostazioniBackup,
  scriviImpostazioniBackup,
  statoUltimoBackup,
  verificaFileBackup,
} from './backup.js';
import { ensureMeta } from './meta.js';
import { runMigrations } from './migrations-runner.js';

describe('backup', () => {
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

  function creaDatabase(): Database.Database {
    dir = mkdtempSync(path.join(tmpdir(), 'conticini-backup-'));
    db = new Database(path.join(dir, 'conticini.db'));
    runMigrations(db);
    ensureMeta(db);
    return db;
  }

  function nomeBackup(date: Date): string {
    const dueCifre = (numero: number) => String(numero).padStart(2, '0');
    return `conticini-${date.getFullYear()}${dueCifre(date.getMonth() + 1)}${dueCifre(date.getDate())}-${dueCifre(date.getHours())}${dueCifre(date.getMinutes())}${dueCifre(date.getSeconds())}.db`;
  }

  it('usa i valori predefiniti se la configurazione manca o non è valida', () => {
    dir = mkdtempSync(path.join(tmpdir(), 'conticini-backup-'));
    const predefinite = {
      cartella: cartellaBackupDefault(dir),
      rotazione: 7,
    };

    expect(leggiImpostazioniBackup(dir)).toEqual(predefinite);

    writeFileSync(path.join(dir, 'backup-config.json'), '{non valido');
    expect(leggiImpostazioniBackup(dir)).toEqual(predefinite);

    writeFileSync(
      path.join(dir, 'backup-config.json'),
      JSON.stringify({ cartella: '', rotazione: -1 }),
    );
    expect(leggiImpostazioniBackup(dir)).toEqual(predefinite);
  });

  it('legge le impostazioni scritte', () => {
    dir = mkdtempSync(path.join(tmpdir(), 'conticini-backup-'));
    const impostazioni = { cartella: path.join(dir, 'copie'), rotazione: 12 };

    scriviImpostazioniBackup(dir, impostazioni);

    expect(leggiImpostazioniBackup(dir)).toEqual(impostazioni);
  });

  it('crea un backup SQLite nella cartella richiesta', async () => {
    const database = creaDatabase();
    const cartella = path.join(dir!, 'copie');

    const backup = await eseguiBackup(database, cartella, 7);

    expect(backup.nomeFile).toMatch(/^conticini-\d{8}-\d{6}(?:-\d+)?\.db$/);
    const backupDb = new Database(path.join(cartella, backup.nomeFile), {
      readonly: true,
    });
    expect(
      backupDb.prepare('SELECT schema_version FROM meta').get(),
    ).toBeDefined();
    backupDb.close();
  });

  it('non sovrascrive due backup concorrenti', async () => {
    const database = creaDatabase();
    const cartella = path.join(dir!, 'copie');

    await Promise.all([
      eseguiBackup(database, cartella, 7),
      eseguiBackup(database, cartella, 7),
    ]);

    const backups = elencaBackup(cartella);
    expect(backups).toHaveLength(2);
    expect(new Set(backups.map((backup) => backup.nomeFile)).size).toBe(2);
  });

  it('mantiene soltanto i backup più recenti nella rotazione', () => {
    dir = mkdtempSync(path.join(tmpdir(), 'conticini-backup-'));
    const cartella = path.join(dir, 'copie');
    const date = [
      new Date(2026, 0, 1, 10, 0, 0),
      new Date(2026, 0, 2, 10, 0, 0),
      new Date(2026, 0, 3, 10, 0, 0),
    ];
    for (const data of date) {
      if (data === date[0]) {
        mkdirSync(cartella, { recursive: true });
      }
      const file = path.join(cartella, nomeBackup(data));
      writeFileSync(file, 'backup');
      utimesSync(file, data, data);
    }

    applicaRotazione(cartella, 2);

    expect(elencaBackup(cartella).map((backup) => backup.nomeFile)).toEqual([
      nomeBackup(date[2]),
      nomeBackup(date[1]),
    ]);
  });

  it('segnala l età dell ultimo backup', () => {
    dir = mkdtempSync(path.join(tmpdir(), 'conticini-backup-'));
    const cartella = path.join(dir, 'copie');
    mkdirSync(cartella, { recursive: true });

    expect(statoUltimoBackup(cartella)).toEqual({
      ultimo: null,
      vecchioDiPiuDi7Giorni: false,
    });

    const vecchio = new Date();
    vecchio.setDate(vecchio.getDate() - 8);
    writeFileSync(path.join(cartella, nomeBackup(vecchio)), 'backup');
    expect(statoUltimoBackup(cartella).vecchioDiPiuDi7Giorni).toBe(true);

    rmSync(cartella, { recursive: true, force: true });
    mkdirSync(cartella, { recursive: true });
    writeFileSync(path.join(cartella, nomeBackup(new Date())), 'backup');
    expect(statoUltimoBackup(cartella).vecchioDiPiuDi7Giorni).toBe(false);
  });

  it('verifica il contenuto e la versione di un backup', async () => {
    const database = creaDatabase();
    const valido = path.join(dir!, 'valido.db');
    await database.backup(valido);
    const schemaVersione = (
      database.prepare('SELECT schema_version FROM meta').get() as {
        schema_version: number;
      }
    ).schema_version;

    expect(() => verificaFileBackup(valido, schemaVersione)).not.toThrow();

    const nonDatabase = path.join(dir!, 'corrotto.db');
    writeFileSync(nonDatabase, 'non è un database');
    expect(() => verificaFileBackup(nonDatabase, schemaVersione)).toThrow(
      ErroreBackupNonValido,
    );

    const senzaMeta = path.join(dir!, 'senza-meta.db');
    const dbSenzaMeta = new Database(senzaMeta);
    dbSenzaMeta.exec('CREATE TABLE prova (id TEXT)');
    dbSenzaMeta.close();
    expect(() => verificaFileBackup(senzaMeta, schemaVersione)).toThrow(
      ErroreBackupNonValido,
    );

    expect(() => verificaFileBackup(valido, schemaVersione - 1)).toThrow(
      ErroreBackupNonValido,
    );
  });
});
