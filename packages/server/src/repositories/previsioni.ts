import { randomUUID } from 'node:crypto';

import {
  validaVincoloPrevisioneFissa,
  type BudgetDefault,
  type BudgetOverride,
  type RepositorioBudgetDefault,
  type RepositorioBudgetOverride,
} from '@conticini/dominio';

import {
  erroreDominio,
  erroreNonTrovato,
  erroreValidazione,
} from '../errori.js';
import { leggiRigaCiclo } from './cicli.js';
import {
  aggiorna as aggiornaRiga,
  inserisci,
  SOLO_ATTIVI,
  type ContestoScrittura,
} from '../scrittura.js';

interface RigaCategoria {
  id: string;
  kind: 'entrata' | 'uscita';
}

interface RigaBudgetDefault {
  id: string;
  category_id: string;
  amount_cents: number;
  revision: string;
}

interface RigaBudgetOverride {
  id: string;
  cycle_id: string;
  category_id: string;
  amount_cents: number;
  revision: string;
}

interface RigaBudgetEffettivo {
  category_id: string;
  amount_cents: number;
  is_override: number;
}

function mappaBudgetDefault(
  riga: Pick<RigaBudgetDefault, 'category_id' | 'amount_cents'>,
): BudgetDefault {
  return {
    categoriaId: riga.category_id,
    amountCents: riga.amount_cents,
  };
}

function mappaBudgetOverride(
  riga: Pick<RigaBudgetOverride, 'cycle_id' | 'category_id' | 'amount_cents'>,
): BudgetOverride {
  return {
    cicloId: riga.cycle_id,
    categoriaId: riga.category_id,
    amountCents: riga.amount_cents,
  };
}

function mappaBudgetEffettivo(riga: RigaBudgetEffettivo): {
  categoriaId: string;
  amountCents: number;
  override: boolean;
} {
  return {
    categoriaId: riga.category_id,
    amountCents: riga.amount_cents,
    override: riga.is_override === 1,
  };
}

function leggiCategoriaPrevisione(
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
      'La categoria di una previsione deve essere di tipo uscita.',
      'categoriaId',
    );
  }

  return categoria;
}

function haFisseAttive(ctx: ContestoScrittura, categoriaId: string): boolean {
  return (
    ctx.db
      .prepare(
        'SELECT 1 FROM recurring_expenses WHERE category_id = ? AND active = 1 AND deleted_at IS NULL',
      )
      .get(categoriaId) !== undefined
  );
}

export function creaRepositorioBudgetDefault(
  ctx: ContestoScrittura,
): RepositorioBudgetDefault {
  function leggiRiga(categoriaId: string): RigaBudgetDefault | undefined {
    return ctx.db
      .prepare(
        `SELECT id, category_id, amount_cents, revision FROM budget_defaults WHERE category_id = ? AND ${SOLO_ATTIVI}`,
      )
      .get(categoriaId) as RigaBudgetDefault | undefined;
  }

  return {
    async elenca() {
      const righe = ctx.db
        .prepare(
          `SELECT category_id, amount_cents FROM budget_defaults WHERE ${SOLO_ATTIVI} ORDER BY category_id`,
        )
        .all() as Pick<RigaBudgetDefault, 'category_id' | 'amount_cents'>[];
      return righe.map(mappaBudgetDefault);
    },

    async imposta(dati) {
      leggiCategoriaPrevisione(ctx, dati.categoriaId);
      const riga = leggiRiga(dati.categoriaId);

      if (!riga) {
        const esito = validaVincoloPrevisioneFissa(
          true,
          haFisseAttive(ctx, dati.categoriaId),
        );
        if (!esito.valido) {
          throw erroreDominio(esito.motivo, 'categoriaId');
        }
        inserisci(ctx, 'budget_defaults', 'budget_defaults', randomUUID(), {
          category_id: dati.categoriaId,
          amount_cents: dati.amountCents,
        });
      } else {
        aggiornaRiga(
          ctx,
          'budget_defaults',
          'budget_defaults',
          riga.id,
          { amount_cents: dati.amountCents },
          riga.revision,
        );
      }

      return mappaBudgetDefault({
        category_id: dati.categoriaId,
        amount_cents: dati.amountCents,
      });
    },
  };
}

export function creaRepositorioBudgetOverride(
  ctx: ContestoScrittura,
): RepositorioBudgetOverride {
  function leggiRiga(
    cicloId: string,
    categoriaId: string,
  ): RigaBudgetOverride | undefined {
    return ctx.db
      .prepare(
        `SELECT id, cycle_id, category_id, amount_cents, revision FROM budget_overrides WHERE cycle_id = ? AND category_id = ? AND ${SOLO_ATTIVI}`,
      )
      .get(cicloId, categoriaId) as RigaBudgetOverride | undefined;
  }

  return {
    async elenca(cicloId) {
      const righe = ctx.db
        .prepare(
          `SELECT category_id, amount_cents FROM budget_overrides WHERE cycle_id = ? AND ${SOLO_ATTIVI} ORDER BY category_id`,
        )
        .all(cicloId) as Pick<
        RigaBudgetOverride,
        'category_id' | 'amount_cents'
      >[];
      return righe.map((riga) =>
        mappaBudgetOverride({ ...riga, cycle_id: cicloId }),
      );
    },

    async imposta(dati) {
      if (!leggiRigaCiclo(ctx, dati.cicloId)) {
        throw erroreNonTrovato('ciclo', dati.cicloId);
      }
      const budgetDefault = ctx.db
        .prepare(
          `SELECT 1 FROM budget_defaults WHERE category_id = ? AND ${SOLO_ATTIVI}`,
        )
        .get(dati.categoriaId);
      if (!budgetDefault) {
        throw erroreValidazione(
          'La categoria non ha una previsione di default.',
          'categoriaId',
        );
      }

      const riga = leggiRiga(dati.cicloId, dati.categoriaId);
      if (!riga) {
        inserisci(ctx, 'budget_overrides', 'budget_overrides', randomUUID(), {
          cycle_id: dati.cicloId,
          category_id: dati.categoriaId,
          amount_cents: dati.amountCents,
        });
      } else {
        aggiornaRiga(
          ctx,
          'budget_overrides',
          'budget_overrides',
          riga.id,
          { amount_cents: dati.amountCents },
          riga.revision,
        );
      }

      return mappaBudgetOverride({
        cycle_id: dati.cicloId,
        category_id: dati.categoriaId,
        amount_cents: dati.amountCents,
      });
    },
  };
}

export function elencaTutteLeBudgetOverride(
  ctx: ContestoScrittura,
): BudgetOverride[] {
  const righe = ctx.db
    .prepare(
      `SELECT cycle_id, category_id, amount_cents FROM budget_overrides WHERE ${SOLO_ATTIVI} ORDER BY category_id`,
    )
    .all() as Array<
    Pick<RigaBudgetOverride, 'cycle_id' | 'category_id' | 'amount_cents'>
  >;

  return righe.map(mappaBudgetOverride);
}

export function budgetEffettivoPerCiclo(
  ctx: ContestoScrittura,
  cicloId: string,
): Array<{ categoriaId: string; amountCents: number; override: boolean }> {
  if (!leggiRigaCiclo(ctx, cicloId)) {
    throw erroreNonTrovato('ciclo', cicloId);
  }

  const righe = ctx.db
    .prepare(
      `SELECT bd.category_id AS category_id,
              COALESCE(bo.amount_cents, bd.amount_cents) AS amount_cents,
              CASE WHEN bo.id IS NULL THEN 0 ELSE 1 END AS is_override
       FROM budget_defaults bd
       LEFT JOIN budget_overrides bo
         ON bo.category_id = bd.category_id
        AND bo.cycle_id = ?
        AND bo.deleted_at IS NULL
       WHERE bd.deleted_at IS NULL
       ORDER BY bd.category_id`,
    )
    .all(cicloId) as RigaBudgetEffettivo[];

  return righe.map(mappaBudgetEffettivo);
}
