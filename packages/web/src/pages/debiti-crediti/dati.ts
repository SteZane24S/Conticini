import {
  elencoContiRispostaSchema,
  elencoMovimentiRispostaSchema,
  elencoPosizioniRispostaSchema,
  posizioneRispostaSchema,
  saldamentoRispostaSchema,
  type ContoDto,
  type CreaPosizioneInput,
  type CreaSaldamentoInput,
  type MovimentoDto,
  type PosizioneDto,
  type SaldamentoRisposta,
} from '@conticini/contratti';
import {
  oggiLocale,
  saldiPerConto,
  somma,
  type DataISO,
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

export async function caricaSaldamenti(
  posizioneId: string,
): Promise<MovimentoDto[]> {
  const parametri = new URLSearchParams({ posizioneId, perPagina: '200' });
  const risposta = await apiGet(
    `/api/movimenti?${parametri.toString()}`,
    elencoMovimentiRispostaSchema,
  );
  return [...risposta.movimenti].sort((prima, seconda) =>
    seconda.data.localeCompare(prima.data),
  );
}

export interface UseDebitiCrediti {
  posizioni: PosizioneDto[];
  conti: ContoDto[];
  soldiSuiContiCents: number;
  caricando: boolean;
  errore: string | null;
  ricarica: () => void;
  crea: (dati: CreaPosizioneInput) => Promise<PosizioneDto>;
  elimina: (id: string) => Promise<void>;
  salda: (id: string, dati: CreaSaldamentoInput) => Promise<SaldamentoRisposta>;
  annullaSaldamento: (movimentoId: string) => Promise<PosizioneDto>;
}

export function useDebitiCrediti(): UseDebitiCrediti {
  const [posizioni, setPosizioni] = useState<PosizioneDto[]>([]);
  const [conti, setConti] = useState<ContoDto[]>([]);
  const [soldiSuiContiCents, setSoldiSuiContiCents] = useState(0);
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
        const [rispostaPosizioni, rispostaConti, movimenti] = await Promise.all(
          [
            apiGet('/api/posizioni', elencoPosizioniRispostaSchema),
            apiGet('/api/conti', elencoContiRispostaSchema),
            scaricaTuttiIMovimenti(),
          ],
        );
        if (annullato) return;
        setPosizioni(rispostaPosizioni.posizioni);
        setConti(rispostaConti.conti);
        const saldi = saldiPerConto(
          oggiLocale(new Date()),
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
        );
        setSoldiSuiContiCents(somma(saldi.map((saldo) => saldo.saldoCents)));
      } catch (err) {
        if (!annullato) {
          setErrore(
            err instanceof ErroreApi ? err.message : 'Errore di caricamento.',
          );
        }
      } finally {
        if (!annullato) setCaricando(false);
      }
    })();
    return () => {
      annullato = true;
    };
  }, [versione]);

  const crea = useCallback(
    async (dati: CreaPosizioneInput) => {
      const risposta = await apiInvia(
        'POST',
        '/api/posizioni',
        dati,
        posizioneRispostaSchema,
      );
      ricarica();
      return risposta.posizione;
    },
    [ricarica],
  );

  const elimina = useCallback(
    async (id: string) => {
      await apiInvia(
        'DELETE',
        `/api/posizioni/${id}`,
        undefined,
        rispostaOkSchema,
      );
      ricarica();
    },
    [ricarica],
  );

  const salda = useCallback(
    async (id: string, dati: CreaSaldamentoInput) => {
      const risposta = await apiInvia(
        'POST',
        `/api/posizioni/${id}/salda`,
        dati,
        saldamentoRispostaSchema,
      );
      ricarica();
      return risposta;
    },
    [ricarica],
  );

  const annullaSaldamento = useCallback(
    async (movimentoId: string) => {
      const risposta = await apiInvia(
        'POST',
        `/api/posizioni/saldamenti/${movimentoId}/annulla`,
        undefined,
        posizioneRispostaSchema,
      );
      ricarica();
      return risposta.posizione;
    },
    [ricarica],
  );

  return {
    posizioni,
    conti,
    soldiSuiContiCents,
    caricando,
    errore,
    ricarica,
    crea,
    elimina,
    salda,
    annullaSaldamento,
  };
}
