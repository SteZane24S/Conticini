import { randomUUID } from 'node:crypto';

import {
  ID_CATEGORIA_TECNICA_INCASSO_CREDITI,
  ID_CATEGORIA_TECNICA_PAGAMENTO_DEBITI,
  normalizzaTesto,
  type RegolaCategoria,
  type RepositorioRegoleCategoria,
} from '@conticini/dominio';

import {
  erroreCategoriaTecnica,
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

interface RigaRevisione {
  revision: string;
}

interface RigaRegola {
  id: string;
  pattern: string;
  category_id: string;
  priority: number;
  active: number;
  deleted_at: string | null;
  created_at: string;
  revision: string;
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

export function creaRepositorioRegoleCategoria(
  ctx: ContestoScrittura,
): RepositorioRegoleCategoria {
  function categoriaEsiste(id: string): boolean {
    return (
      ctx.db
        .prepare(`SELECT 1 FROM categories WHERE id = ? AND ${SOLO_ATTIVI}`)
        .get(id) !== undefined
    );
  }

  function leggiRiga(id: string): RigaRegola | undefined {
    return ctx.db
      .prepare(
        `SELECT id, pattern, category_id, priority, active, deleted_at, created_at, revision FROM category_rules WHERE id = ? AND ${SOLO_ATTIVI}`,
      )
      .get(id) as RigaRegola | undefined;
  }

  function leggiRevisione(id: string): string {
    const riga = ctx.db
      .prepare(
        `SELECT revision FROM category_rules WHERE id = ? AND ${SOLO_ATTIVI}`,
      )
      .get(id) as RigaRevisione | undefined;

    if (!riga) {
      throw erroreNonTrovato('regola', id);
    }

    return riga.revision;
  }

  return {
    async elenca() {
      const righe = ctx.db
        .prepare(
          `SELECT id, pattern, category_id, priority, active, deleted_at, created_at, revision FROM category_rules WHERE ${SOLO_ATTIVI} ORDER BY priority DESC, created_at DESC`,
        )
        .all() as RigaRegola[];

      return righe.map(mappaRegola);
    },

    async ottieni(id) {
      const riga = leggiRiga(id);
      return riga ? mappaRegola(riga) : null;
    },

    async crea(dati) {
      if (!categoriaEsiste(dati.categoriaId)) {
        throw erroreNonTrovato('categoria', dati.categoriaId);
      }
      if (
        dati.categoriaId === ID_CATEGORIA_TECNICA_PAGAMENTO_DEBITI ||
        dati.categoriaId === ID_CATEGORIA_TECNICA_INCASSO_CREDITI
      ) {
        throw erroreCategoriaTecnica('categoriaId');
      }

      const pattern = normalizzaTesto(dati.pattern);
      if (pattern === '') {
        throw erroreValidazione(
          'Il pattern della regola non può essere vuoto dopo la normalizzazione.',
          'pattern',
        );
      }

      const id = randomUUID();
      inserisci(ctx, 'category_rules', 'category_rules', id, {
        pattern,
        category_id: dati.categoriaId,
        priority: dati.priority,
        active: dati.active ? 1 : 0,
      });

      const riga = leggiRiga(id);
      if (!riga) {
        throw erroreNonTrovato('regola', id);
      }

      return mappaRegola(riga);
    },

    async aggiorna(id, dati) {
      const baseRevision = leggiRevisione(id);
      if (
        dati.categoriaId !== undefined &&
        !categoriaEsiste(dati.categoriaId)
      ) {
        throw erroreNonTrovato('categoria', dati.categoriaId);
      }
      if (
        dati.categoriaId !== undefined &&
        (dati.categoriaId === ID_CATEGORIA_TECNICA_PAGAMENTO_DEBITI ||
          dati.categoriaId === ID_CATEGORIA_TECNICA_INCASSO_CREDITI)
      ) {
        throw erroreCategoriaTecnica('categoriaId');
      }

      const colonne: Record<string, string | number> = {};
      if (dati.pattern !== undefined) {
        const pattern = normalizzaTesto(dati.pattern);
        if (pattern === '') {
          throw erroreValidazione(
            'Il pattern della regola non può essere vuoto dopo la normalizzazione.',
            'pattern',
          );
        }
        colonne.pattern = pattern;
      }
      if (dati.categoriaId !== undefined) {
        colonne.category_id = dati.categoriaId;
      }
      if (dati.priority !== undefined) {
        colonne.priority = dati.priority;
      }
      if (dati.active !== undefined) {
        colonne.active = dati.active ? 1 : 0;
      }
      aggiornaRiga(
        ctx,
        'category_rules',
        'category_rules',
        id,
        colonne,
        baseRevision,
      );

      const riga = leggiRiga(id);
      if (!riga) {
        throw erroreNonTrovato('regola', id);
      }

      return mappaRegola(riga);
    },

    async elimina(id) {
      const baseRevision = leggiRevisione(id);
      cancella(ctx, 'category_rules', 'category_rules', id, baseRevision);
    },
  };
}
