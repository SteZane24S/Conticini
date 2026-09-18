import {
  suggerimentiDescrizione as suggerimentiDescrizioneDominio,
  suggerisciCategoria as suggerisciCategoriaDominio,
  type DataISO,
  type RegolaCategoria,
  type ServizioApprendimento,
  type VoceStorico,
} from '@conticini/dominio';

import { SOLO_ATTIVI, type ContestoScrittura } from '../scrittura.js';

interface RigaRegola {
  pattern: string;
  category_id: string;
  priority: number;
  active: number;
  deleted_at: string | null;
  created_at: string;
  id: string;
}

interface RigaStorico {
  description: string;
  description_norm: string;
  category_id: string | null;
  amount_cents: number;
  date: string;
}

function mappaRegola(riga: RigaRegola): RegolaCategoria {
  return {
    id: riga.id,
    pattern: riga.pattern,
    categoriaId: riga.category_id,
    priority: riga.priority,
    active: riga.active === 1,
    deletedAt: riga.deleted_at,
    createdAt: riga.created_at,
  };
}

function mappaStorico(riga: RigaStorico): VoceStorico {
  return {
    descrizione: riga.description,
    descrizioneNorm: riga.description_norm,
    categoriaId: riga.category_id,
    amountCents: riga.amount_cents,
    data: riga.date as DataISO,
  };
}

function leggiRegole(ctx: ContestoScrittura): RegolaCategoria[] {
  const righe = ctx.db
    .prepare(
      `SELECT id, pattern, category_id, priority, active, deleted_at, created_at FROM category_rules WHERE ${SOLO_ATTIVI} AND active = 1`,
    )
    .all() as RigaRegola[];
  return righe.map(mappaRegola);
}

function leggiStorico(ctx: ContestoScrittura): VoceStorico[] {
  const righe = ctx.db
    .prepare(
      `SELECT description, description_norm, category_id, amount_cents, date FROM transactions WHERE ${SOLO_ATTIVI}`,
    )
    .all() as RigaStorico[];
  return righe.map(mappaStorico);
}

export function leggiRegoleEStoricoApprendimento(ctx: ContestoScrittura): {
  regole: RegolaCategoria[];
  storico: VoceStorico[];
} {
  return { regole: leggiRegole(ctx), storico: leggiStorico(ctx) };
}

export function creaServizioApprendimento(
  ctx: ContestoScrittura,
): ServizioApprendimento {
  return {
    async suggerisciCategoria(descrizione) {
      return suggerisciCategoriaDominio(
        descrizione,
        leggiRegole(ctx),
        leggiStorico(ctx),
      );
    },
    async suggerimentiDescrizione(prefisso, limite) {
      return suggerimentiDescrizioneDominio(
        prefisso,
        leggiStorico(ctx),
        limite,
      );
    },
  };
}
