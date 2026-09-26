import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type Database from 'better-sqlite3';

const migrationsDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../migrations',
);
const MARCATORE_RICOSTRUZIONE = '-- ricostruzione-tabelle';

function eMigrazioneRicostruzione(sql: string): boolean {
  return sql.trimStart().startsWith(MARCATORE_RICOSTRUZIONE);
}

function elencaFileMigrazioni(cartella: string = migrationsDir): string[] {
  return readdirSync(cartella).filter((file) => file.endsWith('.sql'));
}

export function migrazioniPendenti(
  db: Database.Database,
  cartella: string = migrationsDir,
): string[] {
  db.exec(
    'CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)',
  );

  const applied = new Set(
    (
      db.prepare('SELECT name FROM schema_migrations').all() as Array<{
        name: string;
      }>
    ).map((row) => row.name),
  );

  const files = elencaFileMigrazioni(cartella);
  for (const file of files) {
    if (!/^\d{3}-.+\.sql$/.test(file)) {
      throw new Error(`Nome migrazione non valido: ${file}`);
    }
  }
  files.sort();

  return files.filter((file) => !applied.has(file));
}

export function runMigrations(
  db: Database.Database,
  cartella: string = migrationsDir,
): void {
  const files = migrazioniPendenti(db, cartella);

  for (const file of files) {
    const sql = readFileSync(path.join(cartella, file), 'utf8');
    if (eMigrazioneRicostruzione(sql)) {
      db.pragma('foreign_keys = OFF');
      try {
        const applicaRicostruzione = db.transaction(() => {
          db.exec(sql);
          const violazioni = db.pragma('foreign_key_check') as unknown[];
          if (violazioni.length > 0) {
            throw new Error(
              `Migrazione ${file}: violazioni di integrita referenziale dopo la ricostruzione (${violazioni.length}).`,
            );
          }
          db.prepare(
            'INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)',
          ).run(file, new Date().toISOString());
        });
        applicaRicostruzione();
      } finally {
        db.pragma('foreign_keys = ON');
      }
      continue;
    }
    const apply = db.transaction(() => {
      db.exec(sql);
      db.prepare(
        'INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)',
      ).run(file, new Date().toISOString());
    });
    apply();
  }
}

export function contaMigrazioniDisponibili(): number {
  return elencaFileMigrazioni().length;
}
