import { useCallback, useEffect, useState } from 'react';
import {
  elencoMovimentiRispostaSchema,
  elencoRegoleCategoriaRispostaSchema,
  regolaCategoriaRispostaSchema,
  type MovimentoDto,
  type RegolaCategoriaDto,
} from '@conticini/contratti';

import { apiGet, apiInvia, rispostaOkSchema } from '../../api.js';

export interface NuovaRegolaInput {
  pattern: string;
  categoriaId: string;
  priority: number;
}

export interface AnteprimaRegola {
  movimenti: MovimentoDto[];
  altri: number;
}

export interface UseRegoleRisultato {
  regole: RegolaCategoriaDto[];
  caricamento: boolean;
  erroreCaricamento: string | null;
  creaRegola: (input: NuovaRegolaInput) => Promise<RegolaCategoriaDto>;
  attivaDisattivaRegola: (
    regola: RegolaCategoriaDto,
  ) => Promise<RegolaCategoriaDto>;
  eliminaRegola: (id: string) => Promise<void>;
  anteprima: (pattern: string) => Promise<AnteprimaRegola>;
}

const PER_PAGINA_ANTEPRIMA = 200;

// Stato e chiamate API delle regole di categorizzazione, separati dalla resa
// JSX (che vive in TabellaRegole.tsx).
export function useRegole(): UseRegoleRisultato {
  const [regole, setRegole] = useState<RegolaCategoriaDto[]>([]);
  const [caricamento, setCaricamento] = useState(true);
  const [erroreCaricamento, setErroreCaricamento] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let annullato = false;
    setCaricamento(true);
    setErroreCaricamento(null);

    apiGet('/api/regole', elencoRegoleCategoriaRispostaSchema)
      .then((risposta) => {
        if (annullato) {
          return;
        }
        setRegole(risposta.regole);
      })
      .catch((errore: unknown) => {
        if (annullato) {
          return;
        }
        setErroreCaricamento(
          errore instanceof Error
            ? errore.message
            : 'Errore di caricamento delle regole.',
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

  const creaRegola = useCallback(async (input: NuovaRegolaInput) => {
    const risposta = await apiInvia(
      'POST',
      '/api/regole',
      input,
      regolaCategoriaRispostaSchema,
    );
    setRegole((precedenti) => [...precedenti, risposta.regola]);
    return risposta.regola;
  }, []);

  const attivaDisattivaRegola = useCallback(
    async (regola: RegolaCategoriaDto) => {
      const risposta = await apiInvia(
        'PATCH',
        `/api/regole/${regola.id}`,
        { active: !regola.active },
        regolaCategoriaRispostaSchema,
      );
      setRegole((precedenti) =>
        precedenti.map((r) => (r.id === regola.id ? risposta.regola : r)),
      );
      return risposta.regola;
    },
    [],
  );

  const eliminaRegola = useCallback(async (id: string) => {
    await apiInvia('DELETE', `/api/regole/${id}`, undefined, rispostaOkSchema);
    setRegole((precedenti) => precedenti.filter((regola) => regola.id !== id));
  }, []);

  const anteprima = useCallback(async (pattern: string) => {
    const risposta = await apiGet(
      `/api/movimenti?testo=${encodeURIComponent(pattern)}&perPagina=${PER_PAGINA_ANTEPRIMA}`,
      elencoMovimentiRispostaSchema,
    );
    return {
      movimenti: risposta.movimenti,
      altri: risposta.totale - risposta.movimenti.length,
    };
  }, []);

  return {
    regole,
    caricamento,
    erroreCaricamento,
    creaRegola,
    attivaDisattivaRegola,
    eliminaRegola,
    anteprima,
  };
}
