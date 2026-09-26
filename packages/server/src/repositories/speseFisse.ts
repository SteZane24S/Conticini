import { randomUUID } from 'node:crypto';

import {
  ID_CATEGORIA_TECNICA_INCASSO_CREDITI,
  ID_CATEGORIA_TECNICA_PAGAMENTO_DEBITI,
  everyNMonths,
  monthly,
  validaVincoloPrevisioneFissa,
  yearly,
  type DataISO,
  type RegolaRicorrenza,
  type RepositorioRicorrenzeFisse,
  type RicorrenzaFissa,
} from '@conticini/dominio';

import {
  erroreCategoriaTecnica,
  erroreDominio,
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

interface RigaSpesaFissa {
  id: string;
  name: string;
  rule_type: 'monthly' | 'every_n_months' | 'yearly';
  interval: number | null;
  anchor_day: number;
  anchor_month: number | null;
  start_date: string;
  end_date: string | null;
  amount_cents: number;
  account_id: string | null;
  category_id: string;
  mode: 'auto' | 'manual';
  active: number;
  revision: string;
}

interface RigaCategoria {
  id: string;
  kind: 'entrata' | 'uscita';
}

interface RigaOccorrenzaPending {
  id: string;
  revision: string;
}

function mappaRegola(riga: RigaSpesaFissa): RegolaRicorrenza {
  const startDate = riga.start_date as DataISO;
  const endDate =
    riga.end_date === null ? undefined : (riga.end_date as DataISO);

  if (riga.rule_type === 'monthly') {
    return monthly(riga.anchor_day, startDate, endDate);
  }
  if (riga.rule_type === 'every_n_months') {
    return everyNMonths(
      riga.interval!,
      riga.anchor_month!,
      riga.anchor_day,
      startDate,
      endDate,
    );
  }
  return yearly(riga.anchor_month!, riga.anchor_day, startDate, endDate);
}

function colonneRegola(
  regola: RegolaRicorrenza,
): Record<string, string | number | null> {
  return {
    rule_type: regola.tipo,
    interval: regola.tipo === 'every_n_months' ? regola.n : null,
    anchor_day: regola.anchorDay,
    anchor_month: regola.tipo === 'monthly' ? null : regola.anchorMonth,
    start_date: regola.startDate,
    end_date: regola.endDate ?? null,
  };
}

function mappaSpesaFissa(riga: RigaSpesaFissa): RicorrenzaFissa {
  return {
    id: riga.id,
    nome: riga.name,
    regola: mappaRegola(riga),
    amountCents: riga.amount_cents,
    contoId: riga.account_id,
    categoriaId: riga.category_id,
    mode: riga.mode,
    active: riga.active === 1,
  };
}

function leggiCategoriaSpesaFissa(
  ctx: ContestoScrittura,
  id: string,
): RigaCategoria {
  const categoria = ctx.db
    .prepare(`SELECT id, kind FROM categories WHERE id = ? AND ${SOLO_ATTIVI}`)
    .get(id) as RigaCategoria | undefined;

  if (!categoria) {
    throw erroreNonTrovato('categoria', id);
  }
  if (categoria.kind !== 'uscita') {
    throw erroreValidazione(
      'La categoria di una spesa fissa deve essere di tipo uscita.',
      'categoriaId',
    );
  }
  if (
    id === ID_CATEGORIA_TECNICA_PAGAMENTO_DEBITI ||
    id === ID_CATEGORIA_TECNICA_INCASSO_CREDITI
  ) {
    throw erroreCategoriaTecnica('categoriaId');
  }

  return categoria;
}

function haPrevisione(ctx: ContestoScrittura, categoriaId: string): boolean {
  return (
    ctx.db
      .prepare(
        'SELECT 1 FROM budget_defaults WHERE category_id = ? AND deleted_at IS NULL',
      )
      .get(categoriaId) !== undefined
  );
}

function validaPrevisioneFissa(
  ctx: ContestoScrittura,
  categoriaId: string,
): void {
  const esito = validaVincoloPrevisioneFissa(
    haPrevisione(ctx, categoriaId),
    true,
  );
  if (!esito.valido) {
    throw erroreDominio(esito.motivo, 'categoriaId');
  }
}

export function creaRepositorioSpeseFisse(
  ctx: ContestoScrittura,
): RepositorioRicorrenzeFisse {
  function leggiRiga(id: string): RigaSpesaFissa | undefined {
    return ctx.db
      .prepare(
        `SELECT id, name, rule_type, interval, anchor_day, anchor_month, start_date, end_date, amount_cents, account_id, category_id, mode, active, revision FROM recurring_expenses WHERE id = ? AND ${SOLO_ATTIVI}`,
      )
      .get(id) as RigaSpesaFissa | undefined;
  }

  function leggiRigaRevisione(id: string): RigaSpesaFissa {
    const riga = leggiRiga(id);
    if (!riga) {
      throw erroreNonTrovato('spesa fissa', id);
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
          `SELECT id, name, rule_type, interval, anchor_day, anchor_month, start_date, end_date, amount_cents, account_id, category_id, mode, active, revision FROM recurring_expenses WHERE ${SOLO_ATTIVI} ORDER BY name`,
        )
        .all() as RigaSpesaFissa[];
      return righe.map(mappaSpesaFissa);
    },

    async ottieni(id) {
      const riga = leggiRiga(id);
      return riga ? mappaSpesaFissa(riga) : null;
    },

    async crea(dati) {
      leggiCategoriaSpesaFissa(ctx, dati.categoriaId);
      if (dati.active) {
        validaPrevisioneFissa(ctx, dati.categoriaId);
      }

      const id = randomUUID();
      inserisci(ctx, 'recurring_expenses', 'recurring_expenses', id, {
        name: dati.nome,
        ...colonneRegola(dati.regola),
        amount_cents: dati.amountCents,
        account_id: null,
        category_id: dati.categoriaId,
        mode: dati.mode,
        active: dati.active ? 1 : 0,
      });

      const riga = leggiRiga(id);
      if (!riga) {
        throw erroreNonTrovato('spesa fissa', id);
      }
      return mappaSpesaFissa(riga);
    },

    async aggiorna(id, dati) {
      const rigaCorrente = leggiRigaRevisione(id);
      const categoriaId = dati.categoriaId ?? rigaCorrente.category_id;
      const amountCents = dati.amountCents ?? rigaCorrente.amount_cents;
      const mode = dati.mode ?? rigaCorrente.mode;
      const active = dati.active ?? rigaCorrente.active === 1;
      const categoriaCambiata = categoriaId !== rigaCorrente.category_id;
      const attivata = active && rigaCorrente.active === 0;

      if (dati.categoriaId !== undefined && categoriaCambiata) {
        leggiCategoriaSpesaFissa(ctx, categoriaId);
      }
      if (active && (categoriaCambiata || attivata)) {
        validaPrevisioneFissa(ctx, categoriaId);
      }

      const colonne: Record<string, string | number | null> = {};
      if (dati.nome !== undefined) {
        colonne.name = dati.nome;
      }
      if (dati.regola !== undefined) {
        Object.assign(colonne, colonneRegola(dati.regola));
      }
      if (dati.amountCents !== undefined) {
        colonne.amount_cents = dati.amountCents;
      }
      if (dati.categoriaId !== undefined) {
        colonne.category_id = dati.categoriaId;
      }
      if (dati.mode !== undefined) {
        colonne.mode = dati.mode;
      }
      if (dati.active !== undefined) {
        colonne.active = dati.active ? 1 : 0;
      }

      const aggiornaSpesa = ctx.db.transaction(() => {
        aggiornaRiga(
          ctx,
          'recurring_expenses',
          'recurring_expenses',
          id,
          colonne,
          rigaCorrente.revision,
        );

        const colonneOccorrenza: Record<string, string | number | null> = {};
        if (amountCents !== rigaCorrente.amount_cents) {
          colonneOccorrenza.amount_cents = amountCents;
        }
        if (categoriaId !== rigaCorrente.category_id) {
          colonneOccorrenza.category_id = categoriaId;
        }
        if (mode !== rigaCorrente.mode) {
          colonneOccorrenza.mode = mode;
        }

        if (Object.keys(colonneOccorrenza).length > 0) {
          const occorrenze = ctx.db
            .prepare(
              "SELECT id, revision FROM recurring_occurrences WHERE recurring_id = ? AND status = 'pending' AND deleted_at IS NULL",
            )
            .all(id) as RigaOccorrenzaPending[];
          for (const occorrenza of occorrenze) {
            aggiornaRiga(
              ctx,
              'recurring_occurrences',
              'recurring_occurrences',
              occorrenza.id,
              colonneOccorrenza,
              occorrenza.revision,
            );
          }
        }
      });
      aggiornaSpesa();

      const riga = leggiRiga(id);
      if (!riga) {
        throw erroreNonTrovato('spesa fissa', id);
      }
      return mappaSpesaFissa(riga);
    },

    async elimina(id) {
      const baseRevision = leggiRevisione(id);
      cancella(
        ctx,
        'recurring_expenses',
        'recurring_expenses',
        id,
        baseRevision,
      );
    },
  };
}
