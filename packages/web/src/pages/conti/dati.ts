import {
  contoRispostaSchema,
  elencoContiRispostaSchema,
  elencoMovimentiRispostaSchema,
  elencoTrasferimentiRispostaSchema,
  trasferimentoRispostaSchema,
  type AggiornaContoInput,
  type AggiornaTrasferimentoInput,
  type ContoDto,
  type CreaContoInput,
  type CreaTrasferimentoInput,
  type MovimentoDto,
  type TrasferimentoDto,
} from '@conticini/contratti';
import {
  oggiLocale,
  saldiPerConto,
  type DataISO,
  type SaldoConto,
} from '@conticini/dominio';
import { useCallback, useEffect, useState } from 'react';

import { apiGet, apiInvia, ErroreApi, rispostaOkSchema } from '../../api.js';

async function scaricaTuttiIMovimenti(): Promise<MovimentoDto[]> {
  const perPagina = 200;
  let pagina = 1;
  const tutti: MovimentoDto[] = [];
  for (;;) {
    const risposta = await apiGet(
      `/api/movimenti?pagina=${pagina}&perPagina=${perPagina}`,
      elencoMovimentiRispostaSchema,
    );
    tutti.push(...risposta.movimenti);
    if (tutti.length >= risposta.totale || risposta.movimenti.length === 0) {
      break;
    }
    pagina += 1;
  }
  return tutti;
}

export interface UseConti {
  conti: ContoDto[];
  saldi: SaldoConto[];
  caricando: boolean;
  errore: string | null;
  crea: (dati: CreaContoInput) => Promise<ContoDto>;
  aggiorna: (id: string, dati: AggiornaContoInput) => Promise<ContoDto>;
  archivia: (id: string) => Promise<ContoDto>;
  ricarica: () => void;
}

export function useConti(): UseConti {
  const [conti, setConti] = useState<ContoDto[]>([]);
  const [saldi, setSaldi] = useState<SaldoConto[]>([]);
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
        const [rispostaConti, movimenti] = await Promise.all([
          apiGet('/api/conti', elencoContiRispostaSchema),
          scaricaTuttiIMovimenti(),
        ]);
        if (annullato) {
          return;
        }
        setConti(rispostaConti.conti);
        const oggi = oggiLocale(new Date());
        setSaldi(
          saldiPerConto(
            oggi,
            rispostaConti.conti.map((conto) => ({
              id: conto.id,
              saldoInizialeCents: conto.saldoInizialeCents,
              dataApertura: conto.dataApertura as DataISO,
            })),
            movimenti.map((movimento) => ({
              id: movimento.id,
              data: movimento.data as DataISO,
              amountCents: movimento.amountCents,
              contoId: movimento.contoId,
              categoriaId: movimento.categoriaId,
              transferGroupId: movimento.transferGroupId,
              posizioneId: movimento.posizioneId,
            })),
          ),
        );
      } catch (err) {
        if (!annullato) {
          setErrore(
            err instanceof ErroreApi ? err.message : 'Errore di caricamento.',
          );
        }
      } finally {
        if (!annullato) {
          setCaricando(false);
        }
      }
    })();
    return () => {
      annullato = true;
    };
  }, [versione]);

  const crea = useCallback(
    async (dati: CreaContoInput) => {
      const risposta = await apiInvia(
        'POST',
        '/api/conti',
        dati,
        contoRispostaSchema,
      );
      ricarica();
      return risposta.conto;
    },
    [ricarica],
  );

  const aggiorna = useCallback(
    async (id: string, dati: AggiornaContoInput) => {
      const risposta = await apiInvia(
        'PATCH',
        `/api/conti/${id}`,
        dati,
        contoRispostaSchema,
      );
      ricarica();
      return risposta.conto;
    },
    [ricarica],
  );

  const archivia = useCallback(
    async (id: string) => {
      const risposta = await apiInvia(
        'DELETE',
        `/api/conti/${id}`,
        undefined,
        contoRispostaSchema,
      );
      ricarica();
      return risposta.conto;
    },
    [ricarica],
  );

  return {
    conti,
    saldi,
    caricando,
    errore,
    crea,
    aggiorna,
    archivia,
    ricarica,
  };
}

export interface UseTrasferimenti {
  trasferimenti: TrasferimentoDto[];
  caricando: boolean;
  errore: string | null;
  crea: (dati: CreaTrasferimentoInput) => Promise<TrasferimentoDto>;
  aggiorna: (
    gruppo: string,
    dati: AggiornaTrasferimentoInput,
  ) => Promise<TrasferimentoDto>;
  elimina: (gruppo: string) => Promise<void>;
}

export function useTrasferimenti(onMutato?: () => void): UseTrasferimenti {
  const [trasferimenti, setTrasferimenti] = useState<TrasferimentoDto[]>([]);
  const [caricando, setCaricando] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);
  const [versione, setVersione] = useState(0);

  const ricarica = useCallback(() => setVersione((v) => v + 1), []);

  useEffect(() => {
    let annullato = false;
    setCaricando(true);
    setErrore(null);
    apiGet('/api/trasferimenti', elencoTrasferimentiRispostaSchema)
      .then((risposta) => {
        if (!annullato) {
          setTrasferimenti(risposta.trasferimenti);
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
    async (dati: CreaTrasferimentoInput) => {
      const risposta = await apiInvia(
        'POST',
        '/api/trasferimenti',
        dati,
        trasferimentoRispostaSchema,
      );
      ricarica();
      onMutato?.();
      return risposta.trasferimento;
    },
    [ricarica, onMutato],
  );

  const aggiorna = useCallback(
    async (gruppo: string, dati: AggiornaTrasferimentoInput) => {
      const risposta = await apiInvia(
        'PUT',
        `/api/trasferimenti/${gruppo}`,
        dati,
        trasferimentoRispostaSchema,
      );
      ricarica();
      onMutato?.();
      return risposta.trasferimento;
    },
    [ricarica, onMutato],
  );

  const elimina = useCallback(
    async (gruppo: string) => {
      await apiInvia(
        'DELETE',
        `/api/trasferimenti/${gruppo}`,
        undefined,
        rispostaOkSchema,
      );
      ricarica();
      onMutato?.();
    },
    [ricarica, onMutato],
  );

  return { trasferimenti, caricando, errore, crea, aggiorna, elimina };
}
