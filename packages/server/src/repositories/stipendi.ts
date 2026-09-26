import { randomUUID } from 'node:crypto';

import {
  ID_CATEGORIA_TECNICA_INCASSO_CREDITI,
  ID_CATEGORIA_TECNICA_PAGAMENTO_DEBITI,
  normalizzaTesto,
  validaSegnoCategoria,
  type CicloConDettagli,
  type DataISO,
  type MovimentoConDettagli,
} from '@conticini/dominio';

import {
  erroreCategoriaTecnica,
  erroreDominio,
  erroreNonTrovato,
  erroreValidazione,
} from '../errori.js';
import {
  inserisci,
  SOLO_ATTIVI,
  type ContestoScrittura,
} from '../scrittura.js';
import { leggiRigaCiclo, mappaCiclo } from './cicli.js';
import { mappaMovimento, type RigaMovimento } from './movimenti.js';

interface RigaCategoria {
  id: string;
  kind: 'entrata' | 'uscita';
}

export interface DatiStipendio {
  data: string;
  amountCents: number;
  contoId: string;
  categoriaId: string;
  descrizione: string;
  expectedNextDate: string;
  expectedAmountCents?: number | null;
}

function leggiCategoria(
  ctx: ContestoScrittura,
  id: string,
): RigaCategoria | undefined {
  const categoria = ctx.db
    .prepare(`SELECT id, kind FROM categories WHERE id = ? AND ${SOLO_ATTIVI}`)
    .get(id) as RigaCategoria | undefined;
  if (
    id === ID_CATEGORIA_TECNICA_PAGAMENTO_DEBITI ||
    id === ID_CATEGORIA_TECNICA_INCASSO_CREDITI
  ) {
    throw erroreCategoriaTecnica('categoriaId');
  }
  return categoria;
}

function leggiRigaMovimento(
  ctx: ContestoScrittura,
  id: string,
): RigaMovimento | undefined {
  return ctx.db
    .prepare(
      `SELECT id, date, amount_cents, account_id, category_id, description, description_norm, transfer_group_id, linked_position_id, revision FROM transactions WHERE id = ? AND ${SOLO_ATTIVI}`,
    )
    .get(id) as RigaMovimento | undefined;
}

function creaMovimentoPerValidazione(dati: DatiStipendio) {
  return {
    id: '',
    data: dati.data as DataISO,
    amountCents: dati.amountCents,
    contoId: dati.contoId,
    categoriaId: dati.categoriaId,
    transferGroupId: null,
    posizioneId: null,
  };
}

function validaSegno(dati: DatiStipendio, categoria: RigaCategoria): void {
  if (categoria.kind !== 'entrata') {
    throw erroreValidazione(
      'La categoria dello stipendio deve essere di tipo entrata.',
      'categoriaId',
    );
  }

  const esito = validaSegnoCategoria(creaMovimentoPerValidazione(dati), {
    id: categoria.id,
    kind: categoria.kind,
  });
  if (!esito.valido) {
    throw erroreDominio(esito.motivo, 'amountCents');
  }
}

export function creaStipendio(
  ctx: ContestoScrittura,
  dati: DatiStipendio,
): { movimento: MovimentoConDettagli; ciclo: CicloConDettagli } {
  const categoria = leggiCategoria(ctx, dati.categoriaId);
  if (!categoria) {
    throw erroreNonTrovato('categoria', dati.categoriaId);
  }

  validaSegno(dati, categoria);

  const movimentoId = randomUUID();
  const cicloId = randomUUID();
  const descriptionNorm = normalizzaTesto(dati.descrizione);
  const scrivi = ctx.db.transaction(() => {
    inserisci(ctx, 'transactions', 'transactions', movimentoId, {
      date: dati.data,
      amount_cents: dati.amountCents,
      account_id: null,
      category_id: dati.categoriaId,
      description: dati.descrizione,
      description_norm: descriptionNorm,
      transfer_group_id: null,
    });
    inserisci(ctx, 'salary_cycles', 'salary_cycles', cicloId, {
      salary_transaction_id: movimentoId,
      start_date: dati.data,
      expected_next_date: dati.expectedNextDate,
      expected_amount_cents: dati.expectedAmountCents ?? null,
    });
  });
  scrivi();

  const rigaMovimento = leggiRigaMovimento(ctx, movimentoId);
  if (!rigaMovimento) {
    throw erroreNonTrovato('movimento', movimentoId);
  }
  const rigaCiclo = leggiRigaCiclo(ctx, cicloId);
  if (!rigaCiclo) {
    throw erroreNonTrovato('ciclo', cicloId);
  }

  return {
    movimento: mappaMovimento(rigaMovimento),
    ciclo: mappaCiclo(rigaCiclo),
  };
}
