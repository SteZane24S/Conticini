import { useCallback, useEffect, useState } from 'react';
import {
  categoriaRispostaSchema,
  elencoCategorieRispostaSchema,
  elencoSettoriRispostaSchema,
  settoreRispostaSchema,
  type CategoriaDto,
  type SettoreDto,
} from '@conticini/contratti';

import { apiGet, apiInvia, rispostaOkSchema } from '../../api.js';

export interface NuovaCategoriaInput {
  nome: string;
  kind: CategoriaDto['kind'];
  settoreId: string;
}

export interface UseAlberoRisultato {
  settori: SettoreDto[];
  categorie: CategoriaDto[];
  caricamento: boolean;
  erroreCaricamento: string | null;
  creaSettore: (nome: string) => Promise<SettoreDto>;
  rinominaSettore: (id: string, nome: string) => Promise<SettoreDto>;
  eliminaSettore: (id: string) => Promise<void>;
  creaCategoria: (input: NuovaCategoriaInput) => Promise<CategoriaDto>;
  rinominaCategoria: (id: string, nome: string) => Promise<CategoriaDto>;
  eliminaCategoria: (id: string) => Promise<void>;
}

// Stato e chiamate API dell'albero settori/categorie, separati dalla resa
// JSX (che vive in AlberoSettori.tsx).
export function useAlbero(): UseAlberoRisultato {
  const [settori, setSettori] = useState<SettoreDto[]>([]);
  const [categorie, setCategorie] = useState<CategoriaDto[]>([]);
  const [caricamento, setCaricamento] = useState(true);
  const [erroreCaricamento, setErroreCaricamento] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let annullato = false;
    setCaricamento(true);
    setErroreCaricamento(null);

    Promise.all([
      apiGet('/api/settori', elencoSettoriRispostaSchema),
      apiGet('/api/categorie', elencoCategorieRispostaSchema),
    ])
      .then(([settoriRisposta, categorieRisposta]) => {
        if (annullato) {
          return;
        }
        setSettori(settoriRisposta.settori);
        setCategorie(categorieRisposta.categorie);
      })
      .catch((errore: unknown) => {
        if (annullato) {
          return;
        }
        setErroreCaricamento(
          errore instanceof Error
            ? errore.message
            : 'Errore di caricamento di settori e categorie.',
        );
      })
      .finally(() => {
        if (!annullato) {
          setCaricamento(false);
        }
      });

    return () => {
      annullato = true;
    };
  }, []);

  const creaSettore = useCallback(async (nome: string) => {
    const risposta = await apiInvia(
      'POST',
      '/api/settori',
      { nome },
      settoreRispostaSchema,
    );
    setSettori((precedenti) => [...precedenti, risposta.settore]);
    return risposta.settore;
  }, []);

  const rinominaSettore = useCallback(async (id: string, nome: string) => {
    const risposta = await apiInvia(
      'PATCH',
      `/api/settori/${id}`,
      { nome },
      settoreRispostaSchema,
    );
    setSettori((precedenti) =>
      precedenti.map((settore) =>
        settore.id === id ? risposta.settore : settore,
      ),
    );
    return risposta.settore;
  }, []);

  const eliminaSettore = useCallback(async (id: string) => {
    await apiInvia('DELETE', `/api/settori/${id}`, undefined, rispostaOkSchema);
    setSettori((precedenti) =>
      precedenti.filter((settore) => settore.id !== id),
    );
  }, []);

  const creaCategoria = useCallback(async (input: NuovaCategoriaInput) => {
    const risposta = await apiInvia(
      'POST',
      '/api/categorie',
      input,
      categoriaRispostaSchema,
    );
    setCategorie((precedenti) => [...precedenti, risposta.categoria]);
    return risposta.categoria;
  }, []);

  const rinominaCategoria = useCallback(async (id: string, nome: string) => {
    const risposta = await apiInvia(
      'PATCH',
      `/api/categorie/${id}`,
      { nome },
      categoriaRispostaSchema,
    );
    setCategorie((precedenti) =>
      precedenti.map((categoria) =>
        categoria.id === id ? risposta.categoria : categoria,
      ),
    );
    return risposta.categoria;
  }, []);

  const eliminaCategoria = useCallback(async (id: string) => {
    await apiInvia(
      'DELETE',
      `/api/categorie/${id}`,
      undefined,
      rispostaOkSchema,
    );
    setCategorie((precedenti) =>
      precedenti.filter((categoria) => categoria.id !== id),
    );
  }, []);

  return {
    settori,
    categorie,
    caricamento,
    erroreCaricamento,
    creaSettore,
    rinominaSettore,
    eliminaSettore,
    creaCategoria,
    rinominaCategoria,
    eliminaCategoria,
  };
}
