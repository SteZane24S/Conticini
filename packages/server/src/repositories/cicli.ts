import { randomUUID } from 'node:crypto';

import type {
  CicloConDettagli,
  DataISO,
  RepositorioCicli,
} from '@conticini/dominio';

import { erroreNonTrovato } from '../errori.js';
import {
  aggiorna as aggiornaRiga,
  inserisci,
  SOLO_ATTIVI,
  type ContestoScrittura,
} from '../scrittura.js';

interface RigaCiclo {
  id: string;
  salary_transaction_id: string;
  start_date: string;
  expected_next_date: string | null;
  expected_amount_cents: number | null;
  revision: string;
}

export function mappaCiclo(riga: RigaCiclo): CicloConDettagli {
  return {
    id: riga.id,
    startDate: riga.start_date as DataISO,
    expectedNextDate: riga.expected_next_date as DataISO | null,
    expectedAmountCents: riga.expected_amount_cents,
    salaryTransactionId: riga.salary_transaction_id,
  };
}

export function leggiRigaCiclo(
  ctx: ContestoScrittura,
  id: string,
): RigaCiclo | undefined {
  return ctx.db
    .prepare(
      `SELECT id, salary_transaction_id, start_date, expected_next_date, expected_amount_cents, revision FROM salary_cycles WHERE id = ? AND ${SOLO_ATTIVI}`,
    )
    .get(id) as RigaCiclo | undefined;
}

export function creaRepositorioCicli(ctx: ContestoScrittura): RepositorioCicli {
  function leggiRigaRevisione(id: string): RigaCiclo {
    const riga = leggiRigaCiclo(ctx, id);
    if (!riga) {
      throw erroreNonTrovato('ciclo', id);
    }

    return riga;
  }

  function leggiRevisione(id: string): string {
    return leggiRigaRevisione(id).revision;
  }

  return {
    async elenca() {
      const righe = ctx.db
        .prepare(
          `SELECT id, salary_transaction_id, start_date, expected_next_date, expected_amount_cents, revision FROM salary_cycles WHERE ${SOLO_ATTIVI} ORDER BY start_date DESC`,
        )
        .all() as RigaCiclo[];

      return righe.map(mappaCiclo);
    },

    async ottieni(id) {
      const riga = leggiRigaCiclo(ctx, id);
      return riga ? mappaCiclo(riga) : null;
    },

    async crea(dati) {
      const id = randomUUID();
      inserisci(ctx, 'salary_cycles', 'salary_cycles', id, {
        salary_transaction_id: dati.salaryTransactionId,
        start_date: dati.startDate,
        expected_next_date: dati.expectedNextDate,
        expected_amount_cents: dati.expectedAmountCents,
      });

      const riga = leggiRigaCiclo(ctx, id);
      if (!riga) {
        throw erroreNonTrovato('ciclo', id);
      }

      return mappaCiclo(riga);
    },

    async aggiorna(id, dati) {
      const colonne: Record<string, string | number | null> = {};
      if (dati.salaryTransactionId !== undefined) {
        colonne.salary_transaction_id = dati.salaryTransactionId;
      }
      if (dati.startDate !== undefined) {
        colonne.start_date = dati.startDate;
      }
      if (dati.expectedNextDate !== undefined) {
        colonne.expected_next_date = dati.expectedNextDate;
      }
      if (dati.expectedAmountCents !== undefined) {
        colonne.expected_amount_cents = dati.expectedAmountCents;
      }

      const baseRevision = leggiRevisione(id);
      aggiornaRiga(
        ctx,
        'salary_cycles',
        'salary_cycles',
        id,
        colonne,
        baseRevision,
      );

      const riga = leggiRigaCiclo(ctx, id);
      if (!riga) {
        throw erroreNonTrovato('ciclo', id);
      }

      return mappaCiclo(riga);
    },
  };
}
