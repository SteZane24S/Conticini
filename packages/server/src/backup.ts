import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync,
  renameSync,
} from 'node:fs';
import path from 'node:path';

import Database from 'better-sqlite3';
import type {
  ImpostazioniBackupDto as ImpostazioniBackup,
  VoceBackupDto as VoceBackup,
} from '@conticini/contratti';

import { openDatabase, percorsoDatabase } from './database.js';
import {
  contaMigrazioniDisponibili,
  runMigrations,
} from './migrations-runner.js';
import { ensureMeta } from './meta.js';
import type { ContestoScrittura } from './scrittura.js';

const NOME_BACKUP_REGEX = /^conticini-(\d{8})-(\d{6})(?:-(\d+))?\.db$/;
const UN_GIORNO_MS = 24 * 60 * 60 * 1000;
const SETTE_GIORNI_MS = 7 * UN_GIORNO_MS;
let codaBackup: Promise<unknown> = Promise.resolve();

export const ROTAZIONE_DEFAULT = 7;

export class ErroreBackupNonValido extends Error {}

function dueCifre(numero: number): string {
  return String(numero).padStart(2, '0');
}

function nomeBackup(date: Date): string {
  return `conticini-${date.getFullYear()}${dueCifre(date.getMonth() + 1)}${dueCifre(date.getDate())}-${dueCifre(date.getHours())}${dueCifre(date.getMinutes())}${dueCifre(date.getSeconds())}.db`;
}

function quandoDaNomeFile(nomeFile: string): string {
  const match = NOME_BACKUP_REGEX.exec(nomeFile);
  if (!match) {
    throw new Error(`Nome di backup non valido: ${nomeFile}`);
  }

  const data = match[1]!;
  const ora = match[2]!;
  return `${data.slice(0, 4)}-${data.slice(4, 6)}-${data.slice(6, 8)}T${ora.slice(0, 2)}:${ora.slice(2, 4)}:${ora.slice(4, 6)}`;
}

function voceBackup(cartella: string, nomeFile: string): VoceBackup {
  const percorso = path.join(cartella, nomeFile);
  return {
    nomeFile,
    quando: quandoDaNomeFile(nomeFile),
    dimensioneByte: statSync(percorso).size,
  };
}

export function cartellaBackupDefault(dataDir: string): string {
  return path.join(dataDir, 'backup');
}

export function leggiImpostazioniBackup(dataDir: string): ImpostazioniBackup {
  const impostazioniDefault: ImpostazioniBackup = {
    cartella: cartellaBackupDefault(dataDir),
    rotazione: ROTAZIONE_DEFAULT,
  };
  const percorsoConfig = path.join(dataDir, 'backup-config.json');

  if (!existsSync(percorsoConfig)) {
    return impostazioniDefault;
  }

  try {
    const contenuto: unknown = JSON.parse(readFileSync(percorsoConfig, 'utf8'));
    if (typeof contenuto !== 'object' || contenuto === null) {
      return impostazioniDefault;
    }
    const impostazioni = contenuto as Partial<ImpostazioniBackup>;

    return {
      cartella:
        typeof impostazioni.cartella === 'string' &&
        impostazioni.cartella.length > 0
          ? impostazioni.cartella
          : impostazioniDefault.cartella,
      rotazione:
        typeof impostazioni.rotazione === 'number' &&
        Number.isInteger(impostazioni.rotazione) &&
        impostazioni.rotazione >= 1
          ? impostazioni.rotazione
          : impostazioniDefault.rotazione,
    };
  } catch {
    return impostazioniDefault;
  }
}

export function scriviImpostazioniBackup(
  dataDir: string,
  impostazioni: ImpostazioniBackup,
): void {
  writeFileSync(
    path.join(dataDir, 'backup-config.json'),
    JSON.stringify(impostazioni, null, 2),
  );
}

export function elencaBackup(cartella: string): VoceBackup[] {
  if (!existsSync(cartella)) {
    return [];
  }

  return readdirSync(cartella)
    .filter((nomeFile) => NOME_BACKUP_REGEX.test(nomeFile))
    .map((nomeFile) => voceBackup(cartella, nomeFile))
    .sort(
      (primo, secondo) =>
        statSync(path.join(cartella, secondo.nomeFile)).mtimeMs -
        statSync(path.join(cartella, primo.nomeFile)).mtimeMs,
    );
}

export function applicaRotazione(cartella: string, rotazione: number): void {
  const backups = elencaBackup(cartella);
  for (const backup of backups.slice(rotazione)) {
    unlinkSync(path.join(cartella, backup.nomeFile));
  }
}

async function eseguiBackupInCoda(
  db: Database.Database | (() => Database.Database),
  cartella: string,
  rotazione: number,
  opzioni?: { applicaRotazione?: boolean },
): Promise<VoceBackup> {
  const database = typeof db === 'function' ? db() : db;
  mkdirSync(cartella, { recursive: true });
  const nomeBase = nomeBackup(new Date());
  const estensione = '.db';
  const prefisso = nomeBase.slice(0, -estensione.length);
  let nomeFile = nomeBase;
  let suffisso = 2;

  while (existsSync(path.join(cartella, nomeFile))) {
    nomeFile = `${prefisso}-${suffisso}${estensione}`;
    suffisso += 1;
  }

  await database.backup(path.join(cartella, nomeFile));
  if (opzioni?.applicaRotazione !== false) {
    applicaRotazione(cartella, rotazione);
  }
  return voceBackup(cartella, nomeFile);
}

export async function eseguiBackup(
  db: Database.Database | (() => Database.Database),
  cartella: string,
  rotazione: number,
  opzioni?: { applicaRotazione?: boolean },
): Promise<VoceBackup> {
  const lavoro = codaBackup.then(() =>
    eseguiBackupInCoda(db, cartella, rotazione, opzioni),
  );
  codaBackup = lavoro.catch(() => undefined);
  return lavoro;
}

export function statoUltimoBackup(cartella: string): {
  ultimo: VoceBackup | null;
  vecchioDiPiuDi7Giorni: boolean;
} {
  const ultimo = elencaBackup(cartella)[0] ?? null;
  if (!ultimo) {
    return { ultimo: null, vecchioDiPiuDi7Giorni: false };
  }

  return {
    ultimo,
    vecchioDiPiuDi7Giorni:
      Date.now() - new Date(ultimo.quando).getTime() > SETTE_GIORNI_MS,
  };
}

export async function eseguiBackupAutomaticoSeNecessario(
  db: Database.Database,
  dataDir: string,
): Promise<void> {
  const impostazioni = leggiImpostazioniBackup(dataDir);
  const ultimo = statoUltimoBackup(impostazioni.cartella).ultimo;
  const eta = ultimo
    ? Date.now() - new Date(ultimo.quando).getTime()
    : Number.POSITIVE_INFINITY;

  if (eta > UN_GIORNO_MS) {
    await eseguiBackup(db, impostazioni.cartella, impostazioni.rotazione);
  }
}

export function verificaFileBackup(
  percorsoFile: string,
  schemaVersionMassima: number,
): void {
  if (!existsSync(percorsoFile)) {
    throw new ErroreBackupNonValido('Il file di backup non esiste.');
  }

  let db: Database.Database | undefined;
  try {
    try {
      db = new Database(percorsoFile, { readonly: true, fileMustExist: true });
    } catch {
      throw new ErroreBackupNonValido(
        'Il file di backup non è un database SQLite apribile.',
      );
    }

    let integrita: Array<{ integrity_check: string }>;
    try {
      integrita = db.prepare('PRAGMA integrity_check').all() as Array<{
        integrity_check: string;
      }>;
    } catch {
      throw new ErroreBackupNonValido(
        'Il file di backup non è un database SQLite apribile.',
      );
    }
    if (integrita.length !== 1 || integrita[0]?.integrity_check !== 'ok') {
      throw new ErroreBackupNonValido(
        'Il controllo di integrità del backup non è riuscito.',
      );
    }

    let meta: { schema_version: number } | undefined;
    try {
      meta = db.prepare('SELECT schema_version FROM meta').get() as
        { schema_version: number } | undefined;
    } catch {
      throw new ErroreBackupNonValido(
        'Il backup non contiene metadati leggibili.',
      );
    }
    if (!meta) {
      throw new ErroreBackupNonValido(
        'Il backup non contiene metadati leggibili.',
      );
    }
    if (meta.schema_version > schemaVersionMassima) {
      throw new ErroreBackupNonValido(
        "Questo backup proviene da una versione più recente dell'app: aggiorna l'app prima di ripristinarlo.",
      );
    }
  } finally {
    db?.close();
  }
}

export async function ripristinaBackup(
  ctx: ContestoScrittura,
  dataDir: string,
  nomeFile: string,
): Promise<void> {
  if (!NOME_BACKUP_REGEX.test(nomeFile) || /[\\/]/.test(nomeFile)) {
    throw new ErroreBackupNonValido('Nome del file di backup non valido.');
  }

  const impostazioni = leggiImpostazioniBackup(dataDir);
  const percorsoBackup = path.join(impostazioni.cartella, nomeFile);
  verificaFileBackup(percorsoBackup, contaMigrazioniDisponibili());

  await eseguiBackup(
    () => ctx.db,
    impostazioni.cartella,
    impostazioni.rotazione,
    { applicaRotazione: false },
  );
  const percorsoDb = percorsoDatabase(dataDir);
  const percorsoTemporaneo = `${percorsoDb}.ripristino-tmp`;
  let nuovoDb: Database.Database | undefined;

  try {
    ctx.db.pragma('wal_checkpoint(TRUNCATE)');
    ctx.db.close();

    for (const fileLaterale of [`${percorsoDb}-wal`, `${percorsoDb}-shm`]) {
      if (existsSync(fileLaterale)) {
        rmSync(fileLaterale, { force: true });
      }
    }

    copyFileSync(percorsoBackup, percorsoTemporaneo);
    renameSync(percorsoTemporaneo, percorsoDb);
    nuovoDb = openDatabase(dataDir);
    runMigrations(nuovoDb);
    ensureMeta(nuovoDb);
    ctx.db = nuovoDb;
  } catch (errore) {
    nuovoDb?.close();
    ctx.db = openDatabase(dataDir);
    ensureMeta(ctx.db);
    throw errore;
  } finally {
    applicaRotazione(impostazioni.cartella, impostazioni.rotazione);
  }
}
