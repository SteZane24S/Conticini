import { randomUUID } from 'node:crypto';

import type Database from 'better-sqlite3';

export interface Meta {
  datasetId: string;
  deviceId: string;
  schemaVersion: number;
}

export function ensureMeta(db: Database.Database): Meta {
  const existing = db
    .prepare(
      'SELECT dataset_id as datasetId, device_id as deviceId, schema_version as schemaVersion FROM meta',
    )
    .get() as Meta | undefined;

  if (existing) {
    const applied = db
      .prepare('SELECT COUNT(*) as count FROM schema_migrations')
      .get() as {
      count: number;
    };

    if (applied.count !== existing.schemaVersion) {
      db.prepare('UPDATE meta SET schema_version = ?').run(applied.count);
      return { ...existing, schemaVersion: applied.count };
    }

    return existing;
  }

  const applied = db
    .prepare('SELECT COUNT(*) as count FROM schema_migrations')
    .get() as {
    count: number;
  };

  const meta: Meta = {
    datasetId: randomUUID(),
    deviceId: randomUUID(),
    schemaVersion: applied.count,
  };

  db.prepare(
    'INSERT INTO meta (dataset_id, device_id, schema_version) VALUES (?, ?, ?)',
  ).run(meta.datasetId, meta.deviceId, meta.schemaVersion);

  return meta;
}
