import {
  elencoMovimentiRispostaSchema,
  elencoOccorrenzeRispostaSchema,
  elencoSpeseFisseRispostaSchema,
  occorrenzaRispostaSchema,
  type CollegaOccorrenzaInput,
  type ConfermaOccorrenzaInput,
  type MovimentoDto,
  type OccorrenzaDto,
} from '@conticini/contratti';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';

import { apiGet, apiInvia, ErroreApi } from '../../api.js';

export const EVENTO_OCCORRENZE_MUTATE = 'conticini:occorrenze-mutate';

export interface OccorrenzaInAttesa extends OccorrenzaDto {
  nome: string;
}

export interface UseOccorrenzeInAttesa {
  occorrenze: OccorrenzaInAttesa[];
  caricando: boolean;
  errore: string | null;
  conferma: (
    id: string,
    dati: ConfermaOccorrenzaInput,
  ) => Promise<OccorrenzaDto>;
  salta: (id: string) => Promise<OccorrenzaDto>;
  collega: (id: string, dati: CollegaOccorrenzaInput) => Promise<OccorrenzaDto>;
  ricarica: () => void;
}

export function useOccorrenzeInAttesa(): UseOccorrenzeInAttesa {
  const [occorrenze, setOccorrenze] = useState<OccorrenzaInAttesa[]>([]);
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
        const [rispostaOccorrenze, rispostaSpeseFisse] = await Promise.all([
          apiGet('/api/occorrenze', elencoOccorrenzeRispostaSchema),
          apiGet('/api/spese-fisse', elencoSpeseFisseRispostaSchema),
        ]);
        if (annullato) return;
        setOccorrenze(
          rispostaOccorrenze.occorrenze.map((occorrenza) => ({
            ...occorrenza,
            nome:
              rispostaSpeseFisse.speseFisse.find(
                (spesaFissa) => spesaFissa.id === occorrenza.ricorrenzaId,
              )?.nome ?? 'Spesa fissa sconosciuta',
          })),
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
  }, [versione]);

  const conferma = useCallback(
    async (id: string, dati: ConfermaOccorrenzaInput) => {
      const risposta = await apiInvia(
        'POST',
        `/api/occorrenze/${id}/conferma`,
        dati,
        occorrenzaRispostaSchema,
      );
      ricarica();
      window.dispatchEvent(new Event(EVENTO_OCCORRENZE_MUTATE));
      return risposta.occorrenza;
    },
    [ricarica],
  );
  const salta = useCallback(
    async (id: string) => {
      const risposta = await apiInvia(
        'POST',
        `/api/occorrenze/${id}/salta`,
        undefined,
        occorrenzaRispostaSchema,
      );
      ricarica();
      window.dispatchEvent(new Event(EVENTO_OCCORRENZE_MUTATE));
      return risposta.occorrenza;
    },
    [ricarica],
  );
  const collega = useCallback(
    async (id: string, dati: CollegaOccorrenzaInput) => {
      const risposta = await apiInvia(
        'POST',
        `/api/occorrenze/${id}/collega`,
        dati,
        occorrenzaRispostaSchema,
      );
      ricarica();
      window.dispatchEvent(new Event(EVENTO_OCCORRENZE_MUTATE));
      return risposta.occorrenza;
    },
    [ricarica],
  );

  return { occorrenze, caricando, errore, conferma, salta, collega, ricarica };
}

export function useConteggioOccorrenzePending(): number | null {
  const [conteggio, setConteggio] = useState<number | null>(null);
  const { pathname } = useLocation();
  const richiestaCorrente = useRef(0);

  const caricaConteggio = useCallback(() => {
    const richiesta = ++richiestaCorrente.current;
    void apiGet('/api/occorrenze', elencoOccorrenzeRispostaSchema)
      .then((risposta) => {
        if (richiestaCorrente.current === richiesta) {
          setConteggio(risposta.occorrenze.length);
        }
      })
      .catch(() => {
        if (richiestaCorrente.current === richiesta) {
          setConteggio(null);
        }
      });
  }, []);

  useEffect(() => caricaConteggio(), [caricaConteggio, pathname]);

  useEffect(() => {
    window.addEventListener(EVENTO_OCCORRENZE_MUTATE, caricaConteggio);
    return () => {
      window.removeEventListener(EVENTO_OCCORRENZE_MUTATE, caricaConteggio);
    };
  }, [caricaConteggio]);

  return conteggio;
}

function dataConScarto(scadenza: string, giorni: number): string {
  const data = new Date(`${scadenza}T12:00:00Z`);
  data.setDate(data.getDate() + giorni);
  return data.toISOString().slice(0, 10);
}

export async function cercaCandidatiCollegamento(
  occorrenza: Pick<
    OccorrenzaInAttesa,
    'contoId' | 'scadenza' | 'amountCentsPrevisto'
  >,
): Promise<MovimentoDto[]> {
  const parametri = new URLSearchParams({
    dataDa: dataConScarto(occorrenza.scadenza, -7),
    dataA: dataConScarto(occorrenza.scadenza, 7),
    perPagina: '200',
  });
  if (occorrenza.contoId !== null) {
    parametri.set('contoId', occorrenza.contoId);
  }
  const risposta = await apiGet(
    `/api/movimenti?${parametri.toString()}`,
    elencoMovimentiRispostaSchema,
  );
  return [...risposta.movimenti]
    .sort(
      (primo, secondo) =>
        Math.abs(primo.amountCents + occorrenza.amountCentsPrevisto) -
        Math.abs(secondo.amountCents + occorrenza.amountCentsPrevisto),
    )
    .slice(0, 10);
}
