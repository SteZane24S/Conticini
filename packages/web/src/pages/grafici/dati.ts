import {
  saldoGiornalieroRispostaSchema,
  spesePerSettoreRispostaSchema,
  previstoSpesoRispostaSchema,
  type SaldoGiornalieroRisposta,
  type SpesePerSettoreRisposta,
  type PrevistoSpesoRisposta,
} from '@conticini/contratti';
import { type DataISO } from '@conticini/dominio';
import { useEffect, useState } from 'react';

import { apiGet, ErroreApi } from '../../api.js';

export type SelezioneIntervallo =
  | { tipo: 'ciclo'; cicloId: string }
  | { tipo: 'periodo'; dataInizio: DataISO; dataFine: DataISO };

export function useSpesePerSettore(selezione: SelezioneIntervallo | null): {
  settori: SpesePerSettoreRisposta['settori'];
  caricando: boolean;
  errore: string | null;
} {
  const [settori, setSettori] = useState<SpesePerSettoreRisposta['settori']>(
    [],
  );
  const [caricando, setCaricando] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const chiaveSelezione = JSON.stringify(selezione);

  useEffect(() => {
    let annullato = false;

    if (selezione === null) {
      setSettori([]);
      setCaricando(false);
      setErrore(null);
      return () => {
        annullato = true;
      };
    }

    setCaricando(true);
    setErrore(null);
    const percorso =
      selezione.tipo === 'ciclo'
        ? '/api/grafici/spese-per-settore?cicloId=' +
          encodeURIComponent(selezione.cicloId)
        : '/api/grafici/spese-per-settore?dataInizio=' +
          selezione.dataInizio +
          '&dataFine=' +
          selezione.dataFine;

    void apiGet(percorso, spesePerSettoreRispostaSchema)
      .then((risposta) => {
        if (!annullato) setSettori(risposta.settori);
      })
      .catch((err: unknown) => {
        if (!annullato) {
          setErrore(
            err instanceof ErroreApi ? err.message : 'Errore di caricamento.',
          );
        }
      })
      .finally(() => {
        if (!annullato) setCaricando(false);
      });

    return () => {
      annullato = true;
    };
  }, [chiaveSelezione]);

  return { settori, caricando, errore };
}

export function useSaldoGiornaliero(
  dataInizio: DataISO | null,
  dataFine: DataISO | null,
): {
  punti: SaldoGiornalieroRisposta['punti'];
  caricando: boolean;
  errore: string | null;
} {
  const [punti, setPunti] = useState<SaldoGiornalieroRisposta['punti']>([]);
  const [caricando, setCaricando] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    let annullato = false;

    if (dataInizio === null || dataFine === null) {
      setPunti([]);
      setCaricando(false);
      setErrore(null);
      return () => {
        annullato = true;
      };
    }

    setCaricando(true);
    setErrore(null);
    void apiGet(
      '/api/grafici/saldo-giornaliero?dataInizio=' +
        dataInizio +
        '&dataFine=' +
        dataFine,
      saldoGiornalieroRispostaSchema,
    )
      .then((risposta) => {
        if (!annullato) setPunti(risposta.punti);
      })
      .catch((err: unknown) => {
        if (!annullato) {
          setErrore(
            err instanceof ErroreApi ? err.message : 'Errore di caricamento.',
          );
        }
      })
      .finally(() => {
        if (!annullato) setCaricando(false);
      });

    return () => {
      annullato = true;
    };
  }, [dataInizio, dataFine]);

  return { punti, caricando, errore };
}

export function usePrevistoSpeso(cicloId: string | null): {
  previstoSpeso: PrevistoSpesoRisposta | null;
  caricando: boolean;
  errore: string | null;
} {
  const [previstoSpeso, setPrevistoSpeso] =
    useState<PrevistoSpesoRisposta | null>(null);
  const [caricando, setCaricando] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    let annullato = false;

    if (cicloId === null) {
      setPrevistoSpeso(null);
      setCaricando(false);
      setErrore(null);
      return () => {
        annullato = true;
      };
    }

    setCaricando(true);
    setErrore(null);
    void apiGet(
      '/api/grafici/previsto-speso?cicloId=' + encodeURIComponent(cicloId),
      previstoSpesoRispostaSchema,
    )
      .then((risposta) => {
        if (!annullato) setPrevistoSpeso(risposta);
      })
      .catch((err: unknown) => {
        if (!annullato) {
          setErrore(
            err instanceof ErroreApi ? err.message : 'Errore di caricamento.',
          );
        }
      })
      .finally(() => {
        if (!annullato) setCaricando(false);
      });

    return () => {
      annullato = true;
    };
  }, [cicloId]);

  return { previstoSpeso, caricando, errore };
}
