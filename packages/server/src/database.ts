import { mkdirSync } from 'node:fs';
import path from 'node:path';

import Database from 'better-sqlite3';

export function percorsoDatabase(dataDir: string): string {
  return path.join(dataDir, 'conticini.db');
}

export function openDatabase(dataDir: string): Database.Database {
  mkdirSync(dataDir, { recursive: true });
  const db = new Database(percorsoDatabase(dataDir));
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}
