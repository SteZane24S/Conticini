import { randomUUID } from 'node:crypto';

import {
  normalizzaTesto,
  type DataISO,
  type OccorrenzaFissaConDettagli,
  type RepositorioOccorrenzeFisse,
} from '@conticini/dominio';
import Database from 'better-sqlite3';

import { ErroreApi, erroreNonTrovato } from '../errori.js';
import {
  aggiorna as aggiornaRiga,
  inserisci,
  SOLO_ATTIVI,
  type ContestoScrittura,
} from '../scrittura.js';

interface RigaOccorrenza {
  id: string;
  recurring_id: string;
  period: string;
  due_date: string;
  amount_cents: number;
  account_id: string;
  category_id: string | null;
  mode: 'auto' | 'manual';
  status: 'pending' | 'paid' | 'skipped';
  transaction_id: string | null;
  revision: string;
  name: string;
  transaction_date: string | null;
}

export function mappaOccorrenza(
  riga: RigaOccorrenza,
): OccorrenzaFissaConDettagli {
  return {
    id: riga.id,
    scadenza: riga.due_date as DataISO,
    amountCentsPrevisto: riga.amount_cents,
    categoriaId: riga.category_id,
    contoId: riga.account_id,
    stato: riga.status,
    movimentoCollegato:
      riga.transaction_id === null
        ? null
        : { data: riga.transaction_date as DataISO },
    ricorrenzaId: riga.recurring_id,
    periodo: riga.period,
  };
}

function leggiOccorrenza(
  ctx: ContestoScrittura,
  id: string,
): RigaOccorrenza | undefined {
  return ctx.db
    .prepare(
      `SELECT recurring_occurrences.id, recurring_id, period, due_date, recurring_occurrences.amount_cents, recurring_occurrences.account_id, recurring_occurrences.category_id, recurring_occurrences.mode, recurring_occurrences.status, transaction_id, recurring_occurrences.revision, recurring_expenses.name, transactions.date AS transaction_date FROM recurring_occurrences JOIN recurring_expenses ON recurring_occurrences.recurring_id = recurring_expenses.id LEFT JOIN transactions ON recurring_occurrences.transaction_id = transactions.id WHERE recurring_occurrences.id = ? AND recurring_occurrences.${SOLO_ATTIVI}`,
    )
    .get(id) as RigaOccorrenza | undefined;
}

function leggiOccorrenzaObbligatoria(
  ctx: ContestoScrittura,
  id: string,
): RigaOccorrenza {
  const riga = leggiOccorrenza(ctx, id);
  if (!riga) {
    throw erroreNonTrovato('occorrenza', id);
  }
  return riga;
}

function verificaOccorrenzaPending(riga: RigaOccorrenza): void {
  if (riga.status !== 'pending') {
    throw new ErroreApi(
      422,
      'occorrenza_non_in_attesa',
      'Questa occorrenza non è più in attesa.',
    );
  }
}

function leggiAggiornata(
  ctx: ContestoScrittura,
  id: string,
): OccorrenzaFissaConDettagli {
  return mappaOccorrenza(leggiOccorrenzaObbligatoria(ctx, id));
}

export function creaRepositorioOccorrenze(
  ctx: ContestoScrittura,
): RepositorioOccorrenzeFisse {
  return {
    async elenca() {
      const righe = ctx.db
        .prepare(
          `SELECT recurring_occurrences.id, recurring_id, period, due_date, recurring_occurrences.amount_cents, recurring_occurrences.account_id, recurring_occurrences.category_id, recurring_occurrences.mode, recurring_occurrences.status, transaction_id, recurring_occurrences.revision, recurring_expenses.name, transactions.date AS transaction_date FROM recurring_occurrences JOIN recurring_expenses ON recurring_occurrences.recurring_id = recurring_expenses.id LEFT JOIN transactions ON recurring_occurrences.transaction_id = transactions.id WHERE recurring_occurrences.${SOLO_ATTIVI} ORDER BY due_date ASC`,
        )
        .all() as RigaOccorrenza[];
      return righe.map(mappaOccorrenza);
    },

    async ottieni(id) {
      const riga = leggiOccorrenza(ctx, id);
      return riga ? mappaOccorrenza(riga) : null;
    },

    async aggiorna(id, dati) {
      const riga = leggiOccorrenzaObbligatoria(ctx, id);
      const colonne: Record<string, string | number | null> = {};
      if (dati.scadenza !== undefined) {
        colonne.due_date = dati.scadenza;
      }
      if (dati.amountCentsPrevisto !== undefined) {
        colonne.amount_cents = dati.amountCentsPrevisto;
      }
      if (dati.categoriaId !== undefined) {
        colonne.category_id = dati.categoriaId;
      }
      if (dati.contoId !== undefined) {
        colonne.account_id = dati.contoId;
      }
      if (dati.stato !== undefined) {
        colonne.status = dati.stato;
      }
      if (dati.ricorrenzaId !== undefined) {
        colonne.recurring_id = dati.ricorrenzaId;
      }
      if (dati.periodo !== undefined) {
        colonne.period = dati.periodo;
      }

      aggiornaRiga(
        ctx,
        'recurring_occurrences',
        'recurring_occurrences',
        id,
        colonne,
        riga.revision,
      );
      return leggiAggiornata(ctx, id);
    },
  };
}

export function elencaOccorrenzePending(
  ctx: ContestoScrittura,
): OccorrenzaFissaConDettagli[] {
  const righe = ctx.db
    .prepare(
      `SELECT recurring_occurrences.id, recurring_id, period, due_date, recurring_occurrences.amount_cents, recurring_occurrences.account_id, recurring_occurrences.category_id, recurring_occurrences.mode, recurring_occurrences.status, transaction_id, recurring_occurrences.revision, recurring_expenses.name, transactions.date AS transaction_date FROM recurring_occurrences JOIN recurring_expenses ON recurring_occurrences.recurring_id = recurring_expenses.id LEFT JOIN transactions ON recurring_occurrences.transaction_id = transactions.id WHERE recurring_occurrences.status = 'pending' AND recurring_occurrences.${SOLO_ATTIVI} ORDER BY due_date ASC`,
    )
    .all() as RigaOccorrenza[];
  return righe.map(mappaOccorrenza);
}

export function confermaOccorrenza(
  ctx: ContestoScrittura,
  id: string,
  correzioni?: { data?: string; amountCents?: number },
): OccorrenzaFissaConDettagli {
  const riga = leggiOccorrenzaObbligatoria(ctx, id);
  verificaOccorrenzaPending(riga);

  const conferma = ctx.db.transaction(() => {
    const movimentoId = randomUUID();
    inserisci(ctx, 'transactions', 'transactions', movimentoId, {
      date: correzioni?.data ?? riga.due_date,
      amount_cents: -(correzioni?.amountCents ?? riga.amount_cents),
      account_id: riga.account_id,
      category_id: riga.category_id,
      description: riga.name,
      description_norm: normalizzaTesto(riga.name),
      transfer_group_id: null,
    });
    aggiornaRiga(
      ctx,
      'recurring_occurrences',
      'recurring_occurrences',
      id,
      { status: 'paid', transaction_id: movimentoId },
      riga.revision,
    );
  });
  conferma();

  return leggiAggiornata(ctx, id);
}

export function saltaOccorrenza(
  ctx: ContestoScrittura,
  id: string,
): OccorrenzaFissaConDettagli {
  const riga = leggiOccorrenzaObbligatoria(ctx, id);
  verificaOccorrenzaPending(riga);
  aggiornaRiga(
    ctx,
    'recurring_occurrences',
    'recurring_occurrences',
    id,
    { status: 'skipped' },
    riga.revision,
  );
  return leggiAggiornata(ctx, id);
}

export function collegaOccorrenza(
  ctx: ContestoScrittura,
  id: string,
  movimentoId: string,
): OccorrenzaFissaConDettagli {
  const riga = leggiOccorrenzaObbligatoria(ctx, id);
  verificaOccorrenzaPending(riga);
  const movimento = ctx.db
    .prepare(`SELECT 1 FROM transactions WHERE id = ? AND ${SOLO_ATTIVI}`)
    .get(movimentoId);
  if (!movimento) {
    throw erroreNonTrovato('movimento', movimentoId);
  }

  try {
    aggiornaRiga(
      ctx,
      'recurring_occurrences',
      'recurring_occurrences',
      id,
      { status: 'paid', transaction_id: movimentoId },
      riga.revision,
    );
  } catch (error) {
    if (
      error instanceof Database.SqliteError &&
      error.code === 'SQLITE_CONSTRAINT_UNIQUE'
    ) {
      throw new ErroreApi(
        409,
        'movimento_gia_collegato',
        "Questo movimento è già collegato a un'altra occorrenza.",
        'movimentoId',
      );
    }
    throw error;
  }

  return leggiAggiornata(ctx, id);
}
