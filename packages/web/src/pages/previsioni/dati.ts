import {
  budgetDefaultRispostaSchema,
  budgetOverrideRispostaSchema,
  elencoBudgetDefaultsRispostaSchema,
  prospettoRispostaSchema,
  type BudgetDefaultDto,
  type CicloDto,
  type ProspettoDto,
} from '@conticini/contratti';
import { aggiungiGiorni, oggiLocale, type DataISO } from '@conticini/dominio';
import { useCallback, useEffect, useState } from 'react';

import { apiGet, apiInvia, ErroreApi, rispostaOkSchema } from '../../api.js';

export interface UsePrevisioni {
  budgetDefaults: BudgetDefaultDto[];
  categorieCiclo: ProspettoDto['categorie'];
  caricando: boolean;
  errore: string | null;
  impostaDefault: (categoriaId: string, amountCents: number) => Promise<void>;
  impostaOverride: (
    cicloId: string,
    categoriaId: string,
    amountCents: number,
  ) => Promise<void>;
  rimuoviDefault: (categoriaId: string) => Promise<void>;
  ricarica: () => void;
}

export function dataRiferimentoCiclo(
  cicli: CicloDto[],
  cicloId: string,
): DataISO {
  const indice = cicli.findIndex((ciclo) => ciclo.id === cicloId);
  if (indice <= 0) {
    return oggiLocale(new Date());
  }
  const successivo = cicli[indice - 1]!;
  return aggiungiGiorni(successivo.startDate as DataISO, -1);
}

export function usePrevisioni(dataRiferimento: DataISO | null): UsePrevisioni {
  const [budgetDefaults, setBudgetDefaults] = useState<BudgetDefaultDto[]>([]);
  const [categorieCiclo, setCategorieCiclo] = useState<
    ProspettoDto['categorie']
  >([]);
  const [caricando, setCaricando] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [versione, setVersione] = useState(0);

  const ricarica = useCallback(() => setVersione((v) => v + 1), []);

  useEffect(() => {
    if (dataRiferimento === null) {
      setBudgetDefaults([]);
      setCategorieCiclo([]);
      setCaricando(false);
      setErrore(null);
      return;
    }

    let annullato = false;
    setCaricando(true);
    setErrore(null);
    Promise.all([
      apiGet('/api/previsioni/default', elencoBudgetDefaultsRispostaSchema),
      apiGet(`/api/prospetto?data=${dataRiferimento}`, prospettoRispostaSchema),
    ])
      .then(([defaultsRisposta, prospettoRisposta]) => {
        if (!annullato) {
          setBudgetDefaults(defaultsRisposta.budgetDefaults);
          setCategorieCiclo(prospettoRisposta.prospetto.categorie);
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
  }, [dataRiferimento, versione]);

  const impostaDefault = useCallback(
    async (categoriaId: string, amountCents: number) => {
      await apiInvia(
        'PUT',
        `/api/previsioni/default/${categoriaId}`,
        { amountCents },
        budgetDefaultRispostaSchema,
      );
      ricarica();
    },
    [ricarica],
  );

  const impostaOverride = useCallback(
    async (cicloId: string, categoriaId: string, amountCents: number) => {
      await apiInvia(
        'PUT',
        `/api/previsioni/override/${cicloId}/${categoriaId}`,
        { amountCents },
        budgetOverrideRispostaSchema,
      );
      ricarica();
    },
    [ricarica],
  );

  const rimuoviDefault = useCallback(
    async (categoriaId: string) => {
      await apiInvia(
        'DELETE',
        `/api/previsioni/default/${categoriaId}`,
        undefined,
        rispostaOkSchema,
      );
      ricarica();
    },
    [ricarica],
  );

  return {
    budgetDefaults,
    categorieCiclo,
    caricando,
    errore,
    impostaDefault,
    impostaOverride,
    rimuoviDefault,
    ricarica,
  };
}
