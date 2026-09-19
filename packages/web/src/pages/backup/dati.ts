import {
  eseguiBackupRispostaSchema,
  impostazioniBackupRispostaSchema,
  statoBackupRispostaSchema,
  type AggiornaImpostazioniBackupInput,
  type ImpostazioniBackupDto,
  type VoceBackupDto,
} from '@conticini/contratti';
import { useCallback, useEffect, useState } from 'react';

import { apiGet, apiInvia, ErroreApi, rispostaOkSchema } from '../../api.js';

export interface UseBackup {
  impostazioni: ImpostazioniBackupDto | null;
  backups: VoceBackupDto[];
  ultimo: VoceBackupDto | null;
  ultimoVecchio: boolean;
  caricando: boolean;
  errore: string | null;
  eseguiOra: () => Promise<VoceBackupDto>;
  aggiornaImpostazioni: (
    dati: AggiornaImpostazioniBackupInput,
  ) => Promise<ImpostazioniBackupDto>;
  ripristina: (nomeFile: string) => Promise<void>;
  ricarica: () => void;
}

export function useBackup(): UseBackup {
  const [impostazioni, setImpostazioni] =
    useState<ImpostazioniBackupDto | null>(null);
  const [backups, setBackups] = useState<VoceBackupDto[]>([]);
  const [ultimo, setUltimo] = useState<VoceBackupDto | null>(null);
  const [ultimoVecchio, setUltimoVecchio] = useState(false);
  const [caricando, setCaricando] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);
  const [versione, setVersione] = useState(0);

  const ricarica = useCallback(() => setVersione((v) => v + 1), []);

  useEffect(() => {
    let annullato = false;
    setCaricando(true);
    setErrore(null);
    apiGet('/api/backup', statoBackupRispostaSchema)
      .then((risposta) => {
        if (!annullato) {
          setImpostazioni(risposta.impostazioni);
          setBackups(risposta.backups);
          setUltimo(risposta.ultimo);
          setUltimoVecchio(risposta.ultimoVecchio);
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

  const eseguiOra = useCallback(async () => {
    const risposta = await apiInvia(
      'POST',
      '/api/backup',
      undefined,
      eseguiBackupRispostaSchema,
    );
    ricarica();
    return risposta.backup;
  }, [ricarica]);

  const aggiornaImpostazioni = useCallback(
    async (dati: AggiornaImpostazioniBackupInput) => {
      const risposta = await apiInvia(
        'PATCH',
        '/api/backup/impostazioni',
        dati,
        impostazioniBackupRispostaSchema,
      );
      ricarica();
      return risposta.impostazioni;
    },
    [ricarica],
  );

  const ripristina = useCallback(
    async (nomeFile: string) => {
      await apiInvia(
        'POST',
        '/api/backup/ripristina',
        { nomeFile },
        rispostaOkSchema,
      );
      ricarica();
    },
    [ricarica],
  );

  return {
    impostazioni,
    backups,
    ultimo,
    ultimoVecchio,
    caricando,
    errore,
    eseguiOra,
    aggiornaImpostazioni,
    ripristina,
    ricarica,
  };
}
