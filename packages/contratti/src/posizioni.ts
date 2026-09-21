import { z } from 'zod';

import { almenoUnCampo, dataIsoRegex, stringaDataIso } from './comune.js';
import { movimentoSchema } from './movimenti.js';

export const versoPosizioneSchema = z.enum(['debito', 'credito']);

export const posizioneSchema = z.object({
  id: z.string(),
  descrizione: z.string(),
  verso: versoPosizioneSchema,
  importoInizialeCents: z.number().int(),
  dataApertura: z.string().regex(dataIsoRegex),
  residuoCents: z.number().int(),
});
export type PosizioneDto = z.infer<typeof posizioneSchema>;

export const creaPosizioneSchema = z.object({
  descrizione: z.string().min(1, 'La descrizione è obbligatoria.'),
  verso: versoPosizioneSchema,
  importoCents: z.number().int().positive("L'importo deve essere positivo."),
});
export type CreaPosizioneInput = z.infer<typeof creaPosizioneSchema>;

export const aggiornaPosizioneSchema = almenoUnCampo(
  z.object({
    descrizione: z.string().min(1, 'La descrizione è obbligatoria.').optional(),
  }),
);
export type AggiornaPosizioneInput = z.infer<typeof aggiornaPosizioneSchema>;

export const creaSaldamentoSchema = z.object({
  contoId: z.string().min(1, 'Il conto è obbligatorio.'),
  importoCents: z.number().int().positive("L'importo deve essere positivo."),
  data: stringaDataIso('Data non valida: usa YYYY-MM-DD.'),
  operazioneId: z.string().min(1, "L'operazione è obbligatoria."),
});
export type CreaSaldamentoInput = z.infer<typeof creaSaldamentoSchema>;

export const posizioneRispostaSchema = z.object({
  ok: z.literal(true),
  posizione: posizioneSchema,
});
export type PosizioneRisposta = z.infer<typeof posizioneRispostaSchema>;

export const elencoPosizioniRispostaSchema = z.object({
  ok: z.literal(true),
  posizioni: z.array(posizioneSchema),
});
export type ElencoPosizioniRisposta = z.infer<
  typeof elencoPosizioniRispostaSchema
>;

export const saldamentoRispostaSchema = z.object({
  ok: z.literal(true),
  movimento: movimentoSchema,
  posizione: posizioneSchema,
});
export type SaldamentoRisposta = z.infer<typeof saldamentoRispostaSchema>;
