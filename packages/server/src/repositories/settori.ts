import { randomUUID } from 'node:crypto';

import type { RepositorioSettori, Settore } from '@conticini/dominio';
import Database from 'better-sqlite3';

import {
  erroreNomeDuplicato,
  erroreNonTrovato,
  erroreSettoreConCategorie,
} from '../errori.js';
import {
  aggiorna as aggiornaRiga,
  cancella,
  inserisci,
  SOLO_ATTIVI,
  type ContestoScrittura,
} from '../scrittura.js';

interface RigaSettore {
  id: string;
  name: string;
}

interface RigaRevisione {
  revision: string;
}

function mappaSettore(riga: RigaSettore): Settore {
  return { id: riga.id, nome: riga.name };
}

export function creaRepositorioSettori(
  ctx: ContestoScrittura,
): RepositorioSettori {
  function leggiRiga(id: string): RigaSettore | undefined {
    return ctx.db
      .prepare(`SELECT id, name FROM sectors WHERE id = ? AND ${SOLO_ATTIVI}`)
      .get(id) as RigaSettore | undefined;
  }

  function leggiRevisione(id: string): string {
    const riga = ctx.db
      .prepare(`SELECT revision FROM sectors WHERE id = ? AND ${SOLO_ATTIVI}`)
      .get(id) as RigaRevisione | undefined;

    if (!riga) {
      throw erroreNonTrovato('settore', id);
    }

    return riga.revision;
  }

  return {
    async elenca() {
      const righe = ctx.db
        .prepare(
          `SELECT id, name FROM sectors WHERE ${SOLO_ATTIVI} ORDER BY name`,
        )
        .all() as RigaSettore[];

      return righe.map(mappaSettore);
    },

    async ottieni(id) {
      const riga = leggiRiga(id);
      return riga ? mappaSettore(riga) : null;
    },

    async crea(dati) {
      const id = randomUUID();
      try {
        inserisci(ctx, 'sectors', 'sectors', id, { name: dati.nome });
      } catch (error) {
        if (
          error instanceof Database.SqliteError &&
          error.code === 'SQLITE_CONSTRAINT_UNIQUE'
        ) {
          throw erroreNomeDuplicato('nome', dati.nome);
        }
        throw error;
      }

      const riga = leggiRiga(id);
      if (!riga) {
        throw erroreNonTrovato('settore', id);
      }

      return mappaSettore(riga);
    },

    async aggiorna(id, dati) {
      const baseRevision = leggiRevisione(id);
      const colonne: Record<string, string> = {};
      if (dati.nome !== undefined) {
        colonne.name = dati.nome;
      }
      try {
        aggiornaRiga(ctx, 'sectors', 'sectors', id, colonne, baseRevision);
      } catch (error) {
        if (
          dati.nome !== undefined &&
          error instanceof Database.SqliteError &&
          error.code === 'SQLITE_CONSTRAINT_UNIQUE'
        ) {
          throw erroreNomeDuplicato('nome', dati.nome);
        }
        throw error;
      }

      const riga = leggiRiga(id);
      if (!riga) {
        throw erroreNonTrovato('settore', id);
      }

      return mappaSettore(riga);
    },

    async elimina(id) {
      const baseRevision = leggiRevisione(id);
      const categoriaAttiva = ctx.db
        .prepare(
          `SELECT 1 FROM categories WHERE sector_id = ? AND ${SOLO_ATTIVI}`,
        )
        .get(id);
      if (categoriaAttiva) {
        throw erroreSettoreConCategorie(id);
      }
      cancella(ctx, 'sectors', 'sectors', id, baseRevision);
    },
  };
}
