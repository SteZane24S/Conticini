import { z } from 'zod';

import { dataIsoRegex, stringaDataIso } from './comune.js';

export const rigaCategoriaSchema = z.object({
  categoriaId: z.string(),
  previstoCents: z.number().int(),
  speseCents: z.number().int(),
  residuoCents: z.number().int(),
  sforamentoCents: z.number().int(),
});

export const saldoContoProspettoSchema = z.object({
  contoId: z.string(),
  saldoCents: z.number().int(),
});

export const occorrenzaFissaProspettoSchema = z.object({
  id: z.string(),
  scadenza: z.string().regex(dataIsoRegex),
  amountCentsPrevisto: z.number().int(),
  categoriaId: z.string().nullable(),
  contoId: z.string(),
  stato: z.enum(['pending', 'paid', 'skipped']),
  movimentoCollegato: z
    .object({ data: z.string().regex(dataIsoRegex) })
    .nullable(),
});

export const prospettoSchema = z.object({
  data: z.string().regex(dataIsoRegex),
  dataFutura: z.boolean(),
  saldoTotaleCents: z.number().int(),
  saldiPerConto: z.array(saldoContoProspettoSchema),
  fisseAncoraDaPagare: z.array(occorrenzaFissaProspettoSchema),
  totaleFisseAncoraDaPagareCents: z.number().int(),
  categorie: z.array(rigaCategoriaSchema),
  saldoPrevistoCents: z.number().int().nullable(),
  motivoSaldoPrevistoAssente: z
    .enum(['orizzonte_mancante', 'orizzonte_superato', 'nessun_ciclo'])
    .nullable(),
  dopoAccreditoCents: z.number().int().nullable(),
});
export type ProspettoDto = z.infer<typeof prospettoSchema>;

export const richiestaProspettoSchema = z.object({
  data: stringaDataIso('Data non valida: usa YYYY-MM-DD.').optional(),
});
export type RichiestaProspetto = z.infer<typeof richiestaProspettoSchema>;

export const prospettoRispostaSchema = z.object({
  ok: z.literal(true),
  prospetto: prospettoSchema,
});
export type ProspettoRisposta = z.infer<typeof prospettoRispostaSchema>;
