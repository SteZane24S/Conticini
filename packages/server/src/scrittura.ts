import { randomUUID } from 'node:crypto';

import type Database from 'better-sqlite3';

const COLONNE_RISERVATE = new Set([
  'id',
  'created_at',
  'updated_at',
  'deleted_at',
  'revision',
  'base_revision',
]);

function verificaColonne(
  colonne: Record<string, string | number | null>,
): void {
  for (const nome of Object.keys(colonne)) {
    if (COLONNE_RISERVATE.has(nome)) {
      throw new Error(`colonna riservata non ammessa in "colonne": ${nome}`);
    }
  }
}

export interface ContestoScrittura {
  db: Database.Database;
  deviceId: string;
}

export const SOLO_ATTIVI = 'deleted_at IS NULL';

function registraLog(
  ctx: ContestoScrittura,
  entity: string,
  entityId: string,
  baseRevision: string | null,
  revision: string,
  payload: Record<string, string | number | null>,
  createdAt: string,
): void {
  ctx.db
    .prepare(
      'INSERT INTO change_log (op_id, device_id, entity, entity_id, base_revision, revision, payload, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    )
    .run(
      randomUUID(),
      ctx.deviceId,
      entity,
      entityId,
      baseRevision,
      revision,
      JSON.stringify(payload),
      createdAt,
    );
}

export function inserisci(
  ctx: ContestoScrittura,
  tabella: string,
  entity: string,
  id: string,
  colonne: Record<string, string | number | null>,
): { revision: string } {
  verificaColonne(colonne);
  const createdAt = new Date().toISOString();
  const revision = randomUUID();
  const riga = {
    id,
    ...colonne,
    created_at: createdAt,
    updated_at: createdAt,
    deleted_at: null,
    revision,
    base_revision: null,
  };
  const columns = Object.keys(riga);

  const write = ctx.db.transaction(() => {
    ctx.db
      .prepare(
        `INSERT INTO ${tabella} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
      )
      .run(...columns.map((column) => riga[column as keyof typeof riga]));
    registraLog(ctx, entity, id, null, revision, riga, createdAt);
  });
  write();

  return { revision };
}

export function aggiorna(
  ctx: ContestoScrittura,
  tabella: string,
  entity: string,
  id: string,
  colonne: Record<string, string | number | null>,
  baseRevision: string,
): { revision: string } {
  verificaColonne(colonne);
  const updatedAt = new Date().toISOString();
  const revision = randomUUID();
  const aggiornamento = {
    ...colonne,
    updated_at: updatedAt,
    revision,
    base_revision: baseRevision,
  };
  const columns = Object.keys(aggiornamento);

  const write = ctx.db.transaction(() => {
    const info = ctx.db
      .prepare(
        `UPDATE ${tabella} SET ${columns.map((column) => `${column} = ?`).join(', ')} WHERE id = ?`,
      )
      .run(
        ...columns.map(
          (column) => aggiornamento[column as keyof typeof aggiornamento],
        ),
        id,
      );
    if (info.changes === 0) {
      throw new Error(`nessuna riga con id "${id}" in "${tabella}"`);
    }
    registraLog(
      ctx,
      entity,
      id,
      baseRevision,
      revision,
      aggiornamento,
      updatedAt,
    );
  });
  write();

  return { revision };
}

export function cancella(
  ctx: ContestoScrittura,
  tabella: string,
  entity: string,
  id: string,
  baseRevision: string,
): { revision: string } {
  const deletedAt = new Date().toISOString();
  const revision = randomUUID();
  const aggiornamento = {
    deleted_at: deletedAt,
    updated_at: deletedAt,
    revision,
    base_revision: baseRevision,
  };

  const write = ctx.db.transaction(() => {
    const info = ctx.db
      .prepare(
        `UPDATE ${tabella} SET deleted_at = ?, updated_at = ?, revision = ?, base_revision = ? WHERE id = ?`,
      )
      .run(
        aggiornamento.deleted_at,
        aggiornamento.updated_at,
        aggiornamento.revision,
        aggiornamento.base_revision,
        id,
      );
    if (info.changes === 0) {
      throw new Error(`nessuna riga con id "${id}" in "${tabella}"`);
    }
    registraLog(
      ctx,
      entity,
      id,
      baseRevision,
      revision,
      aggiornamento,
      deletedAt,
    );
  });
  write();

  return { revision };
}
