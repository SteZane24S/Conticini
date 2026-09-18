import {
  elencoSpeseFisseRispostaSchema,
  spesaFissaRispostaSchema,
  type AggiornaSpesaFissaInput,
  type CreaSpesaFissaInput,
  type RicorrenzaFissaDto,
} from '@conticini/contratti';
import { useCallback, useEffect, useState } from 'react';

import { apiGet, apiInvia, ErroreApi, rispostaOkSchema } from '../../api.js';

export interface UseSpeseFisse {
  speseFisse: RicorrenzaFissaDto[];
  caricando: boolean;
  errore: string | null;
  crea: (dati: CreaSpesaFissaInput) => Promise<RicorrenzaFissaDto>;
  aggiorna: (
    id: string,
    dati: AggiornaSpesaFissaInput,
  ) => Promise<RicorrenzaFissaDto>;
  elimina: (id: string) => Promise<void>;
}

export function useSpeseFisse(): UseSpeseFisse {
  const [speseFisse, setSpeseFisse] = useState<RicorrenzaFissaDto[]>([]);
  const [caricando, setCaricando] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);
  const [versione, setVersione] = useState(0);

  const ricarica = useCallback(() => setVersione((v) => v + 1), []);

  useEffect(() => {
    let annullato = false;
    setCaricando(true);
    setErrore(null);
    apiGet('/api/spese-fisse', elencoSpeseFisseRispostaSchema)
      .then((risposta) => {
        if (!annullato) {
          setSpeseFisse(risposta.speseFisse);
        }
      })
      .catch((err: unknown) => {
        if (!annullato) {
          setErrore(
            err instanceof ErroreApi ? err.message : 'Errore di caricamento.',
          );
        }
      })
      .finally(() => {
        if (!annullato) {
          setCaricando(false);
        }
      });
    return () => {
      annullato = true;
    };
  }, [versione]);

  const crea = useCallback(
    async (dati: CreaSpesaFissaInput) => {
      const risposta = await apiInvia(
        'POST',
        '/api/spese-fisse',
        dati,
        spesaFissaRispostaSchema,
      );
      ricarica();
      return risposta.spesaFissa;
    },
    [ricarica],
  );

  const aggiorna = useCallback(
    async (id: string, dati: AggiornaSpesaFissaInput) => {
      const risposta = await apiInvia(
        'PATCH',
        `/api/spese-fisse/${id}`,
        dati,
        spesaFissaRispostaSchema,
      );
      ricarica();
      return risposta.spesaFissa;
    },
    [ricarica],
  );

  const elimina = useCallback(
    async (id: string) => {
      await apiInvia(
        'DELETE',
        `/api/spese-fisse/${id}`,
        undefined,
        rispostaOkSchema,
      );
      ricarica();
    },
    [ricarica],
  );

  return { speseFisse, caricando, errore, crea, aggiorna, elimina };
}
