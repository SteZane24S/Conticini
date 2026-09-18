import {
  cicloRispostaSchema,
  elencoCicliRispostaSchema,
  stipendioRispostaSchema,
  type AggiornaCicloInput,
  type CicloDto,
  type CreaStipendioInput,
  type StipendioRisposta,
} from '@conticini/contratti';
import { useCallback, useEffect, useState } from 'react';

import { apiGet, apiInvia, ErroreApi } from '../../api.js';

export interface UseStipendio {
  cicli: CicloDto[];
  caricando: boolean;
  errore: string | null;
  crea: (dati: CreaStipendioInput) => Promise<StipendioRisposta>;
  aggiorna: (id: string, dati: AggiornaCicloInput) => Promise<CicloDto>;
  ricarica: () => void;
}

export function useStipendio(): UseStipendio {
  const [cicli, setCicli] = useState<CicloDto[]>([]);
  const [caricando, setCaricando] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);
  const [versione, setVersione] = useState(0);

  const ricarica = useCallback(() => setVersione((v) => v + 1), []);

  useEffect(() => {
    let annullato = false;
    setCaricando(true);
    setErrore(null);
    apiGet('/api/cicli', elencoCicliRispostaSchema)
      .then((risposta) => {
        if (!annullato) {
          setCicli(risposta.cicli);
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
    async (dati: CreaStipendioInput) => {
      const risposta = await apiInvia(
        'POST',
        '/api/stipendi',
        dati,
        stipendioRispostaSchema,
      );
      ricarica();
      return risposta;
    },
    [ricarica],
  );

  const aggiorna = useCallback(
    async (id: string, dati: AggiornaCicloInput) => {
      const risposta = await apiInvia(
        'PATCH',
        `/api/cicli/${id}`,
        dati,
        cicloRispostaSchema,
      );
      ricarica();
      return risposta.ciclo;
    },
    [ricarica],
  );

  return { cicli, caricando, errore, crea, aggiorna, ricarica };
}
