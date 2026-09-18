import { isDataISO } from '@conticini/dominio';
import { z } from 'zod';

export const dataIsoRegex = /^\d{4}-\d{2}-\d{2}$/;

export function stringaDataIso(messaggioFormato: string) {
  return z.string().regex(dataIsoRegex, messaggioFormato).refine(isDataISO, {
    message: 'Data non valida: il giorno non esiste nel mese indicato.',
  });
}

export function almenoUnCampo<T extends z.ZodTypeAny>(schema: T) {
  return schema.refine((dati) => Object.keys(dati as object).length > 0, {
    message: 'Nessun campo da aggiornare.',
  });
}
