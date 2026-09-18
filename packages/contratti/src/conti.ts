import { z } from 'zod';

import { almenoUnCampo, dataIsoRegex, stringaDataIso } from './comune.js';

export const contoSchema = z.object({
  id: z.string(),
  nome: z.string(),
  saldoInizialeCents: z.number().int(),
  dataApertura: z.string().regex(dataIsoRegex),
  archiviato: z.boolean(),
});
export type ContoDto = z.infer<typeof contoSchema>;

export const creaContoSchema = z.object({
  nome: z.string().min(1, 'Il nome del conto è obbligatorio.'),
  saldoInizialeCents: z.number().int(),
  dataApertura: stringaDataIso('Data non valida: usa YYYY-MM-DD.'),
});
export type CreaContoInput = z.infer<typeof creaContoSchema>;

export const aggiornaContoSchema = almenoUnCampo(
  z.object({
    nome: z.string().min(1, 'Il nome del conto è obbligatorio.').optional(),
    saldoInizialeCents: z.number().int().optional(),
    dataApertura: stringaDataIso('Data non valida: usa YYYY-MM-DD.').optional(),
    archiviato: z.boolean().optional(),
  }),
);
export type AggiornaContoInput = z.infer<typeof aggiornaContoSchema>;

export const elencoContiRispostaSchema = z.object({
  ok: z.literal(true),
  conti: z.array(contoSchema),
});
export type ElencoContiRisposta = z.infer<typeof elencoContiRispostaSchema>;

export const contoRispostaSchema = z.object({
  ok: z.literal(true),
  conto: contoSchema,
});
export type ContoRisposta = z.infer<typeof contoRispostaSchema>;
