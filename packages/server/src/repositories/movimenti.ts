import { randomUUID } from 'node:crypto';

import {
  ID_CATEGORIA_TECNICA_INCASSO_CREDITI,
  ID_CATEGORIA_TECNICA_PAGAMENTO_DEBITI,
  normalizzaTesto,
  validaDataApertura,
  validaSegnoCategoria,
  type DataISO,
  type MovimentoConDettagli,
  type RepositorioMovimenti,
} from '@conticini/dominio';

import {
  ErroreApi,
  erroreCategoriaTecnica,
  erroreDominio,
  erroreMovimentoDiSaldamento,
  erroreNonTrovato,
  erroreValidazione,
} from '../errori.js';
import {
  aggiorna as aggiornaRiga,
  cancella,
  inserisci,
  SOLO_ATTIVI,
  type ContestoScrittura,
} from '../scrittura.js';

export interface RigaMovimento {
  id: string;
  date: string;
  amount_cents: number;
  account_id: string | null;
  category_id: string | null;
  description: string;
  description_norm: string;
  transfer_group_id: string | null;
  linked_position_id: string | null;
  revision: string;
}

export interface RigaConto {
  id: string;
  opened_on: string;
}

interface RigaCategoria {
  id: string;
  kind: 'entrata' | 'uscita';
}

interface RigaTotale {
  totale: number;
}

export function mappaMovimento(riga: RigaMovimento): MovimentoConDettagli {
  return {
    id: riga.id,
    data: riga.date as DataISO,
    amountCents: riga.amount_cents,
    contoId: riga.account_id,
    categoriaId: riga.category_id,
    descrizione: riga.description,
    descrizioneNorm: riga.description_norm,
    transferGroupId: riga.transfer_group_id,
    posizioneId: riga.linked_position_id,
  };
}

export function leggiConto(
  ctx: ContestoScrittura,
  id: string,
): RigaConto | undefined {
  return ctx.db
    .prepare(
      `SELECT id, opened_on FROM accounts WHERE id = ? AND ${SOLO_ATTIVI}`,
    )
    .get(id) as RigaConto | undefined;
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

function creaMovimentoPerValidazione(
  dati: Pick<
    MovimentoConDettagli,
    'data' | 'amountCents' | 'contoId' | 'categoriaId'
  >,
) {
  return {
    id: '',
    data: dati.data,
    amountCents: dati.amountCents,
    contoId: dati.contoId,
    categoriaId: dati.categoriaId,
    transferGroupId: null,
    posizioneId: null,
  };
}

function validaSegno(
  dati: Pick<
    MovimentoConDettagli,
    'data' | 'amountCents' | 'contoId' | 'categoriaId'
  >,
  categoria: RigaCategoria,
): void {
  const esitoSegno = validaSegnoCategoria(creaMovimentoPerValidazione(dati), {
    id: categoria.id,
    kind: categoria.kind,
  });
  if (!esitoSegno.valido) {
    throw erroreDominio(esitoSegno.motivo, 'amountCents');
  }
}

function validaData(
  dati: Pick<
    MovimentoConDettagli,
    'data' | 'amountCents' | 'contoId' | 'categoriaId'
  >,
  conto: RigaConto,
): void {
  const esitoData = validaDataApertura(creaMovimentoPerValidazione(dati), {
    id: conto.id,
    dataApertura: conto.opened_on as DataISO,
    saldoInizialeCents: 0,
  });
  if (!esitoData.valido) {
    throw erroreDominio(esitoData.motivo, 'data');
  }
}

export interface FiltriRicercaMovimenti {
  dataDa?: string;
  dataA?: string;
  contoId?: string;
  settoreId?: string;
  categoriaId?: string;
  posizioneId?: string;
  testo?: string;
}

export interface PaginazioneMovimenti {
  pagina: number;
  perPagina: number;
}

export interface RisultatoMovimenti {
  elementi: MovimentoConDettagli[];
  totale: number;
}

interface DatiCreazioneMovimento {
  data: string;
  amountCents: number;
  categoriaId: string | null;
  descrizione: string;
}

interface RepositorioMovimentiServer extends Omit<
  RepositorioMovimenti,
  'crea'
> {
  crea(dati: DatiCreazioneMovimento): Promise<MovimentoConDettagli>;
}

function costruisciFiltro(filtri: FiltriRicercaMovimenti): {
  where: string;
  join: string;
  parametri: string[];
} {
  const condizioni = [`transactions.${SOLO_ATTIVI}`];
  const parametri: string[] = [];
  const unisceCategorie = filtri.settoreId !== undefined;

  if (filtri.dataDa !== undefined) {
    condizioni.push('date >= ?');
    parametri.push(filtri.dataDa);
  }
  if (filtri.dataA !== undefined) {
    condizioni.push('date <= ?');
    parametri.push(filtri.dataA);
  }
  if (filtri.contoId !== undefined) {
    condizioni.push('account_id = ?');
    parametri.push(filtri.contoId);
  }
  if (filtri.categoriaId !== undefined) {
    condizioni.push('category_id = ?');
    parametri.push(filtri.categoriaId);
  }
  if (filtri.posizioneId !== undefined) {
    condizioni.push('linked_position_id = ?');
    parametri.push(filtri.posizioneId);
  }
  if (filtri.settoreId !== undefined) {
    condizioni.push('categories.sector_id = ?');
    parametri.push(filtri.settoreId);
  }
  if (filtri.testo !== undefined) {
    condizioni.push('description_norm LIKE ?');
    parametri.push(`%${normalizzaTesto(filtri.testo)}%`);
  }

  const join = unisceCategorie
    ? 'JOIN categories ON transactions.category_id = categories.id'
    : '';
  const where = condizioni.join(' AND ');
  return { where, join, parametri };
}

export function cercaMovimenti(
  ctx: ContestoScrittura,
  filtri: FiltriRicercaMovimenti,
  paginazione: PaginazioneMovimenti,
): RisultatoMovimenti {
  const { where, join, parametri } = costruisciFiltro(filtri);
  const totale = ctx.db
    .prepare(
      `SELECT COUNT(*) as totale FROM transactions ${join} WHERE ${where}`,
    )
    .get(...parametri) as RigaTotale;
  const offset = (paginazione.pagina - 1) * paginazione.perPagina;
  const righe = ctx.db
    .prepare(
      `SELECT transactions.* FROM transactions ${join} WHERE ${where} ORDER BY date DESC, transactions.created_at DESC LIMIT ? OFFSET ?`,
    )
    .all(...parametri, paginazione.perPagina, offset) as RigaMovimento[];

  return { elementi: righe.map(mappaMovimento), totale: totale.totale };
}

export function elencaMovimentiFiltrati(
  ctx: ContestoScrittura,
  filtri: FiltriRicercaMovimenti,
): MovimentoConDettagli[] {
  const { where, join, parametri } = costruisciFiltro(filtri);
  const righe = ctx.db
    .prepare(
      `SELECT transactions.* FROM transactions ${join} WHERE ${where} ORDER BY date DESC, transactions.created_at DESC`,
    )
    .all(...parametri) as RigaMovimento[];
  return righe.map(mappaMovimento);
}

export function creaRepositorioMovimenti(
  ctx: ContestoScrittura,
): RepositorioMovimentiServer {
  function leggiRiga(id: string): RigaMovimento | undefined {
    return ctx.db
      .prepare(
        `SELECT id, date, amount_cents, account_id, category_id, description, description_norm, transfer_group_id, linked_position_id, revision FROM transactions WHERE id = ? AND ${SOLO_ATTIVI}`,
      )
      .get(id) as RigaMovimento | undefined;
  }

  return {
    async elenca() {
      const righe = ctx.db
        .prepare(
          `SELECT id, date, amount_cents, account_id, category_id, description, description_norm, transfer_group_id, linked_position_id, revision FROM transactions WHERE ${SOLO_ATTIVI} ORDER BY date DESC`,
        )
        .all() as RigaMovimento[];
      return righe.map(mappaMovimento);
    },

    async ottieni(id) {
      const riga = leggiRiga(id);
      return riga ? mappaMovimento(riga) : null;
    },

    async crea(dati) {
      if (dati.categoriaId === null) {
        throw erroreValidazione('La categoria è obbligatoria.', 'categoriaId');
      }
      const categoria = leggiCategoria(ctx, dati.categoriaId);
      if (!categoria) {
        throw erroreNonTrovato('categoria', dati.categoriaId);
      }

      const datiValidazione = {
        ...dati,
        contoId: null,
        data: dati.data as DataISO,
      };
      validaSegno(datiValidazione, categoria);

      const id = randomUUID();
      const descriptionNorm = normalizzaTesto(dati.descrizione);
      inserisci(ctx, 'transactions', 'transactions', id, {
        date: dati.data,
        amount_cents: dati.amountCents,
        account_id: null,
        category_id: dati.categoriaId,
        description: dati.descrizione,
        description_norm: descriptionNorm,
        transfer_group_id: null,
      });

      const riga = leggiRiga(id);
      if (!riga) {
        throw erroreNonTrovato('movimento', id);
      }
      return mappaMovimento(riga);
    },

    async aggiorna(id, dati) {
      const riga = leggiRiga(id);
      if (!riga) {
        throw erroreNonTrovato('movimento', id);
      }
      if (riga.transfer_group_id !== null) {
        throw new ErroreApi(
          422,
          'movimento_di_trasferimento',
          "Questo movimento fa parte di un trasferimento: modificalo con l'endpoint dei trasferimenti.",
        );
      }
      if (riga.linked_position_id !== null) {
        throw erroreMovimentoDiSaldamento();
      }

      const contoId = riga.account_id;
      const categoriaId =
        'categoriaId' in dati ? dati.categoriaId : riga.category_id;
      const amountCents = dati.amountCents ?? riga.amount_cents;
      const data = dati.data ?? (riga.date as DataISO);

      if (categoriaId === null) {
        throw erroreValidazione('La categoria è obbligatoria.', 'categoriaId');
      }

      if (dati.data !== undefined && contoId !== null) {
        const conto = leggiConto(ctx, contoId);
        if (!conto) {
          throw erroreNonTrovato('conto', contoId);
        }
        validaData(
          { data, amountCents, contoId, categoriaId: categoriaId ?? null },
          conto,
        );
      }

      if (dati.categoriaId !== undefined || dati.amountCents !== undefined) {
        if (categoriaId !== null && categoriaId !== undefined) {
          const categoria = leggiCategoria(ctx, categoriaId);
          if (!categoria) {
            throw erroreNonTrovato('categoria', categoriaId);
          }
          validaSegno({ data, amountCents, contoId, categoriaId }, categoria);
        }
      }

      const colonne: Record<string, string | number | null> = {};
      if (dati.data !== undefined) {
        colonne.date = dati.data;
      }
      if (dati.amountCents !== undefined) {
        colonne.amount_cents = dati.amountCents;
      }
      if (dati.categoriaId !== undefined) {
        colonne.category_id = dati.categoriaId;
      }
      if (dati.descrizione !== undefined) {
        colonne.description = dati.descrizione;
        colonne.description_norm = normalizzaTesto(dati.descrizione);
      }

      aggiornaRiga(
        ctx,
        'transactions',
        'transactions',
        id,
        colonne,
        riga.revision,
      );

      const aggiornata = leggiRiga(id);
      if (!aggiornata) {
        throw erroreNonTrovato('movimento', id);
      }
      return mappaMovimento(aggiornata);
    },

    async elimina(id) {
      const riga = leggiRiga(id);
      if (!riga) {
        throw erroreNonTrovato('movimento', id);
      }
      if (riga.transfer_group_id !== null) {
        throw new ErroreApi(
          422,
          'movimento_di_trasferimento',
          "Questo movimento fa parte di un trasferimento: modificalo con l'endpoint dei trasferimenti.",
        );
      }
      if (riga.linked_position_id !== null) {
        throw erroreMovimentoDiSaldamento();
      }
      cancella(ctx, 'transactions', 'transactions', id, riga.revision);
    },
  };
}
