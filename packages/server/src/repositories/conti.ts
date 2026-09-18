import { randomUUID } from 'node:crypto';

import type {
  ContoConDettagli,
  DataISO,
  RepositorioConti,
} from '@conticini/dominio';

import { erroreNonTrovato } from '../errori.js';
import {
  aggiorna as aggiornaRiga,
  inserisci,
  SOLO_ATTIVI,
  type ContestoScrittura,
} from '../scrittura.js';

interface RigaConto {
  id: string;
  name: string;
  initial_balance_cents: number;
  opened_on: string;
  archived: number;
}

interface RigaRevisione {
  revision: string;
}

function mappaConto(riga: RigaConto): ContoConDettagli {
  return {
    id: riga.id,
    nome: riga.name,
    saldoInizialeCents: riga.initial_balance_cents,
    dataApertura: riga.opened_on as DataISO,
    archiviato: riga.archived === 1,
  };
}

export function creaRepositorioConti(ctx: ContestoScrittura): RepositorioConti {
  function leggiRiga(id: string): RigaConto | undefined {
    return ctx.db
      .prepare(
        `SELECT id, name, initial_balance_cents, opened_on, archived FROM accounts WHERE id = ? AND ${SOLO_ATTIVI}`,
      )
      .get(id) as RigaConto | undefined;
  }

  function leggiRevisione(id: string): string {
    const riga = ctx.db
      .prepare(`SELECT revision FROM accounts WHERE id = ? AND ${SOLO_ATTIVI}`)
      .get(id) as RigaRevisione | undefined;

    if (!riga) {
      throw erroreNonTrovato('conto', id);
    }

    return riga.revision;
  }

  return {
    async elenca() {
      const righe = ctx.db
        .prepare(
          `SELECT id, name, initial_balance_cents, opened_on, archived FROM accounts WHERE ${SOLO_ATTIVI} ORDER BY name`,
        )
        .all() as RigaConto[];

      return righe.map(mappaConto);
    },

    async ottieni(id) {
      const riga = leggiRiga(id);
      return riga ? mappaConto(riga) : null;
    },

    async crea(dati) {
      const id = randomUUID();
      inserisci(ctx, 'accounts', 'accounts', id, {
        name: dati.nome,
        initial_balance_cents: dati.saldoInizialeCents,
        opened_on: dati.dataApertura,
        archived: dati.archiviato ? 1 : 0,
      });

      const riga = leggiRiga(id);
      if (!riga) {
        throw erroreNonTrovato('conto', id);
      }

      return mappaConto(riga);
    },

    async aggiorna(id, dati) {
      const colonne: Record<string, string | number | null> = {};
      if (dati.nome !== undefined) {
        colonne.name = dati.nome;
      }
      if (dati.saldoInizialeCents !== undefined) {
        colonne.initial_balance_cents = dati.saldoInizialeCents;
      }
      if (dati.dataApertura !== undefined) {
        colonne.opened_on = dati.dataApertura;
      }
      if (dati.archiviato !== undefined) {
        colonne.archived = dati.archiviato ? 1 : 0;
      }

      const baseRevision = leggiRevisione(id);
      aggiornaRiga(ctx, 'accounts', 'accounts', id, colonne, baseRevision);

      const riga = leggiRiga(id);
      if (!riga) {
        throw erroreNonTrovato('conto', id);
      }

      return mappaConto(riga);
    },

    async archivia(id) {
      const baseRevision = leggiRevisione(id);
      aggiornaRiga(
        ctx,
        'accounts',
        'accounts',
        id,
        { archived: 1 },
        baseRevision,
      );
    },
  };
}
