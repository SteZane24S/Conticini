import {
  elencoMovimentiRispostaSchema,
  movimentoRispostaSchema,
  suggerimentiRispostaSchema,
  type AggiornaMovimentoInput,
  type CreaMovimentoInput,
  type MovimentoDto,
  type SuggerimentoDescrizioneDto,
} from '@conticini/contratti';
import { useCallback, useEffect, useState } from 'react';

import { apiGet, apiInvia, ErroreApi, rispostaOkSchema } from '../../api.js';

export interface FiltriMovimentiUI {
  dataDa?: string;
  dataA?: string;
  contoId?: string;
  settoreId?: string;
  categoriaId?: string;
  testo?: string;
}

export interface UseMovimenti {
  movimenti: MovimentoDto[];
  totale: number;
  totaleEntrateCents: number;
  totaleUsciteCents: number;
  caricando: boolean;
  errore: string | null;
  crea: (dati: CreaMovimentoInput) => Promise<MovimentoDto>;
  aggiorna: (id: string, dati: AggiornaMovimentoInput) => Promise<MovimentoDto>;
  elimina: (id: string) => Promise<void>;
  ricarica: () => void;
}

export function useMovimenti(filtri: FiltriMovimentiUI): UseMovimenti {
  const [movimenti, setMovimenti] = useState<MovimentoDto[]>([]);
  const [totale, setTotale] = useState(0);
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
        const perPagina = 200;
        let pagina = 1;
        let totaleRisposta = 0;
        const tutti: MovimentoDto[] = [];
        for (;;) {
          const parametri = new URLSearchParams({
            pagina: String(pagina),
            perPagina: String(perPagina),
          });
          if (filtri.dataDa !== undefined && filtri.dataDa !== '') {
            parametri.set('dataDa', filtri.dataDa);
          }
          if (filtri.dataA !== undefined && filtri.dataA !== '') {
            parametri.set('dataA', filtri.dataA);
          }
          if (filtri.contoId !== undefined && filtri.contoId !== '') {
            parametri.set('contoId', filtri.contoId);
          }
          if (filtri.settoreId !== undefined && filtri.settoreId !== '') {
            parametri.set('settoreId', filtri.settoreId);
          }
          if (filtri.categoriaId !== undefined && filtri.categoriaId !== '') {
            parametri.set('categoriaId', filtri.categoriaId);
          }
          if (filtri.testo !== undefined && filtri.testo !== '') {
            parametri.set('testo', filtri.testo);
          }
          const risposta = await apiGet(
            `/api/movimenti?${parametri.toString()}`,
            elencoMovimentiRispostaSchema,
          );
          if (annullato) {
            return;
          }
          tutti.push(...risposta.movimenti);
          totaleRisposta = risposta.totale;
          if (
            tutti.length >= risposta.totale ||
            risposta.movimenti.length === 0
          ) {
            break;
          }
          pagina += 1;
        }
        if (!annullato) {
          setMovimenti(tutti);
          setTotale(totaleRisposta);
        }
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
  }, [
    filtri.dataDa,
    filtri.dataA,
    filtri.contoId,
    filtri.settoreId,
    filtri.categoriaId,
    filtri.testo,
    versione,
  ]);

  const crea = useCallback(
    async (dati: CreaMovimentoInput) => {
      const risposta = await apiInvia(
        'POST',
        '/api/movimenti',
        dati,
        movimentoRispostaSchema,
      );
      ricarica();
      return risposta.movimento;
    },
    [ricarica],
  );

  const aggiorna = useCallback(
    async (id: string, dati: AggiornaMovimentoInput) => {
      const risposta = await apiInvia(
        'PATCH',
        `/api/movimenti/${id}`,
        dati,
        movimentoRispostaSchema,
      );
      ricarica();
      return risposta.movimento;
    },
    [ricarica],
  );

  const elimina = useCallback(
    async (id: string) => {
      await apiInvia(
        'DELETE',
        `/api/movimenti/${id}`,
        undefined,
        rispostaOkSchema,
      );
      ricarica();
    },
    [ricarica],
  );

  const totaleEntrateCents = movimenti.reduce(
    (somma, movimento) =>
      movimento.amountCents > 0 ? somma + movimento.amountCents : somma,
    0,
  );
  const totaleUsciteCents = movimenti.reduce(
    (somma, movimento) =>
      movimento.amountCents < 0
        ? somma + Math.abs(movimento.amountCents)
        : somma,
    0,
  );

  return {
    movimenti,
    totale,
    totaleEntrateCents,
    totaleUsciteCents,
    caricando,
    errore,
    crea,
    aggiorna,
    elimina,
    ricarica,
  };
}

export interface UseSuggerimenti {
  suggerimenti: SuggerimentoDescrizioneDto[];
  categoriaSuggerita: string | null;
  caricando: boolean;
}

export function useSuggerimenti(testo: string, limite = 8): UseSuggerimenti {
  const [suggerimenti, setSuggerimenti] = useState<
    SuggerimentoDescrizioneDto[]
  >([]);
  const [categoriaSuggerita, setCategoriaSuggerita] = useState<string | null>(
    null,
  );
  const [caricando, setCaricando] = useState(false);

  useEffect(() => {
    let annullato = false;
    const testoPulito = testo.trim();
    if (testoPulito.length < 2) {
      setSuggerimenti([]);
      setCategoriaSuggerita(null);
      setCaricando(false);
      return () => {
        annullato = true;
      };
    }
    setCaricando(true);
    setSuggerimenti([]);
    setCategoriaSuggerita(null);
    const timer = setTimeout(() => {
      void apiGet(
        `/api/suggerimenti?testo=${encodeURIComponent(testoPulito)}&limite=${limite}`,
        suggerimentiRispostaSchema,
      )
        .then((risposta) => {
          if (!annullato) {
            setSuggerimenti(risposta.suggerimenti);
            setCategoriaSuggerita(risposta.categoriaSuggerita);
          }
        })
        .catch(() => {
          if (!annullato) {
            setSuggerimenti([]);
            setCategoriaSuggerita(null);
          }
        })
        .finally(() => {
          if (!annullato) {
            setCaricando(false);
          }
        });
    }, 300);
    return () => {
      annullato = true;
      clearTimeout(timer);
    };
  }, [testo, limite]);

  return { suggerimenti, categoriaSuggerita, caricando };
}
