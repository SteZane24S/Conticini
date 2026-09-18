import { randomUUID } from 'node:crypto';

import type {
  CategoriaConDettagli,
  RepositorioCategorie,
} from '@conticini/dominio';
import Database from 'better-sqlite3';

import {
  erroreNomeDuplicato,
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

interface RigaCategoria {
  id: string;
  sector_id: string;
  name: string;
  kind: 'entrata' | 'uscita';
}

interface RigaRevisione {
  revision: string;
  name: string;
}

function mappaCategoria(riga: RigaCategoria): CategoriaConDettagli {
  return {
    id: riga.id,
    settoreId: riga.sector_id,
    nome: riga.name,
    kind: riga.kind,
  };
}

function settoreEsiste(ctx: ContestoScrittura, id: string): boolean {
  return (
    ctx.db
      .prepare(`SELECT 1 FROM sectors WHERE id = ? AND ${SOLO_ATTIVI}`)
      .get(id) !== undefined
  );
}

export function creaRepositorioCategorie(
  ctx: ContestoScrittura,
): RepositorioCategorie {
  function leggiRiga(id: string): RigaCategoria | undefined {
    return ctx.db
      .prepare(
        `SELECT id, sector_id, name, kind FROM categories WHERE id = ? AND ${SOLO_ATTIVI}`,
      )
      .get(id) as RigaCategoria | undefined;
  }

  function leggiRigaRevisione(id: string): RigaRevisione {
    const riga = ctx.db
      .prepare(
        `SELECT revision, name FROM categories WHERE id = ? AND ${SOLO_ATTIVI}`,
      )
      .get(id) as RigaRevisione | undefined;

    if (!riga) {
      throw erroreNonTrovato('categoria', id);
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
          `SELECT id, sector_id, name, kind FROM categories WHERE ${SOLO_ATTIVI} ORDER BY name`,
        )
        .all() as RigaCategoria[];

      return righe.map(mappaCategoria);
    },

    async ottieni(id) {
      const riga = leggiRiga(id);
      return riga ? mappaCategoria(riga) : null;
    },

    async crea(dati) {
      if (!settoreEsiste(ctx, dati.settoreId)) {
        throw erroreNonTrovato('settore', dati.settoreId);
      }

      const id = randomUUID();
      try {
        inserisci(ctx, 'categories', 'categories', id, {
          sector_id: dati.settoreId,
          name: dati.nome,
          kind: dati.kind,
        });
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
        throw erroreNonTrovato('categoria', id);
      }

      return mappaCategoria(riga);
    },

    async aggiorna(id, dati) {
      const rigaCorrente = leggiRigaRevisione(id);
      const baseRevision = rigaCorrente.revision;
      if (dati.settoreId !== undefined && !settoreEsiste(ctx, dati.settoreId)) {
        throw erroreNonTrovato('settore', dati.settoreId);
      }

      const colonne: Record<string, string> = {};
      if (dati.nome !== undefined) {
        colonne.name = dati.nome;
      }
      if (dati.kind !== undefined) {
        colonne.kind = dati.kind;
      }
      if (dati.settoreId !== undefined) {
        colonne.sector_id = dati.settoreId;
      }
      try {
        aggiornaRiga(
          ctx,
          'categories',
          'categories',
          id,
          colonne,
          baseRevision,
        );
      } catch (error) {
        if (
          error instanceof Database.SqliteError &&
          error.code === 'SQLITE_CONSTRAINT_UNIQUE'
        ) {
          throw erroreNomeDuplicato('nome', dati.nome ?? rigaCorrente.name);
        }
        throw error;
      }

      const riga = leggiRiga(id);
      if (!riga) {
        throw erroreNonTrovato('categoria', id);
      }

      return mappaCategoria(riga);
    },

    async elimina(id) {
      const baseRevision = leggiRevisione(id);
      cancella(ctx, 'categories', 'categories', id, baseRevision);
    },
  };
}

export async function creaCategoriaConSettoreEventuale(
  ctx: ContestoScrittura,
  dati: {
    nome: string;
    kind: 'entrata' | 'uscita';
    settoreId?: string;
    settoreNome?: string;
  },
): Promise<CategoriaConDettagli> {
  if (dati.settoreId !== undefined && dati.settoreNome === undefined) {
    return creaRepositorioCategorie(ctx).crea({
      nome: dati.nome,
      kind: dati.kind,
      settoreId: dati.settoreId,
    });
  }

  const settoreNome = dati.settoreNome;
  if (dati.settoreId !== undefined || settoreNome === undefined) {
    throw erroreValidazione(
      'Indica esattamente uno tra settoreId e settoreNome.',
    );
  }

  const categoriaId = randomUUID();
  const scrivi = ctx.db.transaction(() => {
    const settoreId = randomUUID();
    try {
      inserisci(ctx, 'sectors', 'sectors', settoreId, { name: settoreNome });
    } catch (error) {
      if (
        error instanceof Database.SqliteError &&
        error.code === 'SQLITE_CONSTRAINT_UNIQUE'
      ) {
        throw erroreNomeDuplicato('settoreNome', settoreNome);
      }
      throw error;
    }

    try {
      inserisci(ctx, 'categories', 'categories', categoriaId, {
        sector_id: settoreId,
        name: dati.nome,
        kind: dati.kind,
      });
    } catch (error) {
      if (
        error instanceof Database.SqliteError &&
        error.code === 'SQLITE_CONSTRAINT_UNIQUE'
      ) {
        throw erroreNomeDuplicato('nome', dati.nome);
      }
      throw error;
    }
  });
  scrivi();

  const categoria = await creaRepositorioCategorie(ctx).ottieni(categoriaId);
  if (!categoria) {
    throw erroreNonTrovato('categoria', categoriaId);
  }

  return categoria;
}
