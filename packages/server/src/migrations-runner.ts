import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type Database from 'better-sqlite3';

const migrationsDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../migrations',
);

function elencaFileMigrazioni(): string[] {
  return readdirSync(migrationsDir).filter((file) => file.endsWith('.sql'));
}

export function runMigrations(db: Database.Database): void {
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

  const files = elencaFileMigrazioni();
  for (const file of files) {
    if (!/^\d{3}-.+\.sql$/.test(file)) {
      throw new Error(`Nome migrazione non valido: ${file}`);
    }
  }
  files.sort();

  for (const file of files) {
    if (applied.has(file)) continue;

    const sql = readFileSync(path.join(migrationsDir, file), 'utf8');
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
