import {
  elencoOccorrenzeRispostaSchema,
  elencoSpeseFisseRispostaSchema,
  prospettoRispostaSchema,
  type ProspettoDto,
} from '@conticini/contratti';
import { type DataISO } from '@conticini/dominio';
import { useCallback, useEffect, useState } from 'react';

import { apiGet, ErroreApi } from '../../api.js';

export interface UseProspetto {
  prospetto: ProspettoDto | null;
  fisseArricchite: Array<
    ProspettoDto['fisseAncoraDaPagare'][number] & { nome: string }
  >;
  caricando: boolean;
  errore: string | null;
  ricarica: () => void;
}

export function useProspetto(data: DataISO): UseProspetto {
  const [prospetto, setProspetto] = useState<ProspettoDto | null>(null);
  const [fisseArricchite, setFisseArricchite] = useState<
    UseProspetto['fisseArricchite']
  >([]);
  const [caricando, setCaricando] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);
  const [versione, setVersione] = useState(0);

  const ricarica = useCallback(() => setVersione((v) => v + 1), []);

  useEffect(() => {
    let annullato = false;
    setCaricando(true);
    setErrore(null);
    void (async () => {
      try {
        const [rispostaProspetto, rispostaOccorrenze, rispostaSpeseFisse] =
          await Promise.all([
            apiGet(`/api/prospetto?data=${data}`, prospettoRispostaSchema),
            apiGet(
              '/api/occorrenze?tutte=true',
              elencoOccorrenzeRispostaSchema,
            ),
            apiGet('/api/spese-fisse', elencoSpeseFisseRispostaSchema),
          ]);
        if (annullato) return;
        setProspetto(rispostaProspetto.prospetto);
        setFisseArricchite(
          rispostaProspetto.prospetto.fisseAncoraDaPagare.map((occorrenza) => {
            const ricorrenzaId = rispostaOccorrenze.occorrenze.find(
              (occorrenzaElenco) => occorrenzaElenco.id === occorrenza.id,
            )?.ricorrenzaId;
            return {
              ...occorrenza,
              nome:
                rispostaSpeseFisse.speseFisse.find(
                  (spesaFissa) => spesaFissa.id === ricorrenzaId,
                )?.nome ?? 'Spesa fissa sconosciuta',
            };
          }),
        );
      } catch (err) {
        if (!annullato)
          setErrore(
            err instanceof ErroreApi ? err.message : 'Errore di caricamento.',
          );
      } finally {
        if (!annullato) setCaricando(false);
      }
    })();
    return () => {
      annullato = true;
    };
  }, [data, versione]);

  return { prospetto, fisseArricchite, caricando, errore, ricarica };
}
