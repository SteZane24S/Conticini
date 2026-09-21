import { randomUUID } from 'node:crypto';

import {
  calcolaResiduoCents,
  categoriaSaldamentoPer,
  normalizzaTesto,
  oggiLocale,
  segnoMovimentoSaldamento,
  uuidv5,
  validaDataApertura,
  validaSaldamento,
  validaSegnoCategoria,
  NAMESPACE_CONTICINI,
  type DataISO,
  type MovimentoConDettagli,
  type Posizione,
  type PosizioneConResiduo,
  type RepositorioPosizioni,
  type VersoPosizione,
} from '@conticini/dominio';
import Database from 'better-sqlite3';

import {
  erroreDominio,
  erroreEliminazionePosizioneConSaldamenti,
  erroreNonTrovato,
  erroreSaldamentoInConflitto,
} from '../errori.js';
import {
  aggiorna as aggiornaRiga,
  cancella,
  inserisci,
  SOLO_ATTIVI,
  type ContestoScrittura,
} from '../scrittura.js';
import { leggiConto, mappaMovimento, type RigaMovimento } from './movimenti.js';

interface RigaPosizione {
  id: string;
  description: string;
  direction: 'debito' | 'credito';
  initial_amount_cents: number;
  opened_on: string;
  revision: string;
}

interface RigaSaldamento {
  id: string;
  linked_position_id: string | null;
  revision: string;
}

interface RigaCategoria {
  id: string;
  kind: 'entrata' | 'uscita';
}

export function mappaPosizione(riga: RigaPosizione): Posizione {
  return {
    id: riga.id,
    descrizione: riga.description,
    verso: riga.direction,
    importoInizialeCents: riga.initial_amount_cents,
    dataApertura: riga.opened_on as DataISO,
  };
}

function leggiMovimentiCollegati(
  ctx: ContestoScrittura,
  posizioneId: string,
): { amountCents: number }[] {
  return (
    ctx.db
      .prepare(
        'SELECT amount_cents FROM transactions WHERE linked_position_id = ? AND deleted_at IS NULL',
      )
      .all(posizioneId) as Array<{ amount_cents: number }>
  ).map((riga) => ({ amountCents: riga.amount_cents }));
}

function leggiPosizione(
  ctx: ContestoScrittura,
  id: string,
): RigaPosizione | undefined {
  return ctx.db
    .prepare(
      `SELECT id, description, direction, initial_amount_cents, opened_on, revision FROM debt_credit_positions WHERE id = ? AND ${SOLO_ATTIVI}`,
    )
    .get(id) as RigaPosizione | undefined;
}

function leggiPosizioneObbligatoria(
  ctx: ContestoScrittura,
  id: string,
): RigaPosizione {
  const riga = leggiPosizione(ctx, id);
  if (!riga) {
    throw erroreNonTrovato('posizione', id);
  }
  return riga;
}

function leggiPosizioneConResiduo(
  ctx: ContestoScrittura,
  id: string,
): PosizioneConResiduo {
  const riga = leggiPosizioneObbligatoria(ctx, id);
  const residuoCents = calcolaResiduoCents(
    riga.initial_amount_cents,
    leggiMovimentiCollegati(ctx, id),
  );
  return { ...mappaPosizione(riga), residuoCents };
}

function leggiMovimento(
  ctx: ContestoScrittura,
  id: string,
): RigaMovimento | undefined {
  return ctx.db
    .prepare(
      `SELECT id, date, amount_cents, account_id, category_id, description, description_norm, transfer_group_id, linked_position_id, revision FROM transactions WHERE id = ? AND ${SOLO_ATTIVI}`,
    )
    .get(id) as RigaMovimento | undefined;
}

function leggiCategoriaTecnica(
  ctx: ContestoScrittura,
  id: string,
): RigaCategoria | undefined {
  return ctx.db
    .prepare('SELECT id, kind FROM categories WHERE id = ?')
    .get(id) as RigaCategoria | undefined;
}

export function creaRepositorioPosizioni(
  ctx: ContestoScrittura,
): RepositorioPosizioni {
  return {
    async elenca() {
      const righe = ctx.db
        .prepare(
          `SELECT id, description, direction, initial_amount_cents, opened_on, revision FROM debt_credit_positions WHERE ${SOLO_ATTIVI} ORDER BY opened_on DESC`,
        )
        .all() as RigaPosizione[];
      return righe.map((riga) => ({
        ...mappaPosizione(riga),
        residuoCents: calcolaResiduoCents(
          riga.initial_amount_cents,
          leggiMovimentiCollegati(ctx, riga.id),
        ),
      }));
    },

    async ottieni(id) {
      return leggiPosizione(ctx, id) ? leggiPosizioneConResiduo(ctx, id) : null;
    },

    async crea(dati) {
      const id = randomUUID();
      inserisci(ctx, 'debt_credit_positions', 'debt_credit_positions', id, {
        description: dati.descrizione,
        direction: dati.verso,
        initial_amount_cents: dati.importoInizialeCents,
        opened_on: oggiLocale(new Date()),
      });
      return leggiPosizioneConResiduo(ctx, id);
    },

    async aggiorna(id, dati) {
      const riga = leggiPosizioneObbligatoria(ctx, id);
      if (dati.descrizione !== undefined) {
        aggiornaRiga(
          ctx,
          'debt_credit_positions',
          'debt_credit_positions',
          id,
          { description: dati.descrizione },
          riga.revision,
        );
      }
      return leggiPosizioneConResiduo(ctx, id);
    },

    async elimina(id) {
      const riga = leggiPosizioneObbligatoria(ctx, id);
      const movimentiCollegati = leggiMovimentiCollegati(ctx, id);
      if (movimentiCollegati.length > 0) {
        throw erroreEliminazionePosizioneConSaldamenti(id);
      }
      cancella(
        ctx,
        'debt_credit_positions',
        'debt_credit_positions',
        id,
        riga.revision,
      );
    },
  };
}

export function saldaPosizione(
  ctx: ContestoScrittura,
  posizioneId: string,
  dati: {
    contoId: string;
    importoCents: number;
    data: string;
    operazioneId: string;
  },
): { movimento: MovimentoConDettagli; posizione: PosizioneConResiduo } {
  const riga = leggiPosizioneObbligatoria(ctx, posizioneId);
  const conto = leggiConto(ctx, dati.contoId);
  if (!conto) {
    throw erroreNonTrovato('conto', dati.contoId);
  }
  const verso = riga.direction as VersoPosizione;
  const categoriaId = categoriaSaldamentoPer(verso);
  const amountCents = dati.importoCents * segnoMovimentoSaldamento(verso);
  const movimentoId = uuidv5(
    `${posizioneId}:${dati.operazioneId}`,
    NAMESPACE_CONTICINI,
  );
  const esistente = leggiMovimento(ctx, movimentoId);
  if (esistente) {
    if (
      esistente.amount_cents !== amountCents ||
      esistente.account_id !== dati.contoId ||
      esistente.date !== dati.data
    ) {
      throw erroreSaldamentoInConflitto();
    }
    return {
      movimento: mappaMovimento(esistente),
      posizione: leggiPosizioneConResiduo(ctx, posizioneId),
    };
  }

  const movimentiCollegati = leggiMovimentiCollegati(ctx, posizioneId);
  const residuoCents = calcolaResiduoCents(
    riga.initial_amount_cents,
    movimentiCollegati,
  );
  const esito = validaSaldamento(dati.importoCents, residuoCents);
  if (!esito.valido) {
    throw erroreDominio(esito.motivo, 'importoCents');
  }
  const movimentoPerValidazione = {
    id: '',
    data: dati.data as DataISO,
    amountCents,
    contoId: dati.contoId,
    categoriaId,
    transferGroupId: null,
    posizioneId: null,
  };
  const categoria = leggiCategoriaTecnica(ctx, categoriaId);
  if (!categoria) {
    throw erroreNonTrovato('categoria', categoriaId);
  }
  const esitoSegno = validaSegnoCategoria(movimentoPerValidazione, categoria);
  if (!esitoSegno.valido) {
    throw erroreDominio(esitoSegno.motivo, 'importoCents');
  }
  const esitoData = validaDataApertura(movimentoPerValidazione, {
    id: conto.id,
    dataApertura: conto.opened_on as DataISO,
    saldoInizialeCents: 0,
  });
  if (!esitoData.valido) {
    throw erroreDominio(esitoData.motivo, 'data');
  }

  const scrivi = ctx.db.transaction(() => {
    try {
      inserisci(ctx, 'transactions', 'transactions', movimentoId, {
        date: dati.data,
        amount_cents: amountCents,
        account_id: dati.contoId,
        category_id: categoriaId,
        description: riga.description,
        description_norm: normalizzaTesto(riga.description),
        transfer_group_id: null,
        linked_position_id: posizioneId,
      });
    } catch (error) {
      if (!(
        error instanceof Database.SqliteError &&
        (error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY' ||
          error.code === 'SQLITE_CONSTRAINT_UNIQUE')
      )) {
        throw error;
      }
    }
  });
  scrivi();

  const movimento = leggiMovimento(ctx, movimentoId);
  if (!movimento) {
    throw erroreNonTrovato('movimento', movimentoId);
  }
  return {
    movimento: mappaMovimento(movimento),
    posizione: leggiPosizioneConResiduo(ctx, posizioneId),
  };
}

export function annullaSaldamento(
  ctx: ContestoScrittura,
  movimentoId: string,
): PosizioneConResiduo {
  const riga = ctx.db
    .prepare(
      `SELECT id, linked_position_id, revision FROM transactions WHERE id = ? AND ${SOLO_ATTIVI}`,
    )
    .get(movimentoId) as RigaSaldamento | undefined;
  if (!riga || riga.linked_position_id === null) {
    throw erroreNonTrovato('saldamento', movimentoId);
  }
  cancella(ctx, 'transactions', 'transactions', movimentoId, riga.revision);
  return leggiPosizioneConResiduo(ctx, riga.linked_position_id);
}
