import { z } from 'zod';

import { dataIsoRegex, stringaDataIso } from './comune.js';

export const movimentoCollegatoSchema = z.object({
  data: z.string().regex(dataIsoRegex),
});

export const occorrenzaSchema = z.object({
  id: z.string(),
  scadenza: z.string().regex(dataIsoRegex),
  amountCentsPrevisto: z.number().int(),
  categoriaId: z.string().nullable(),
  contoId: z.string(),
  stato: z.enum(['pending', 'paid', 'skipped']),
  movimentoCollegato: movimentoCollegatoSchema.nullable(),
  ricorrenzaId: z.string(),
  periodo: z.string(),
});
export type OccorrenzaDto = z.infer<typeof occorrenzaSchema>;

export const confermaOccorrenzaSchema = z.object({
  data: stringaDataIso('Data non valida: usa YYYY-MM-DD.').optional(),
  amountCents: z
    .number()
    .int()
    .refine((v) => v > 0, { message: "L'importo deve essere positivo." })
    .optional(),
});
export type ConfermaOccorrenzaInput = z.infer<typeof confermaOccorrenzaSchema>;

export const collegaOccorrenzaSchema = z.object({
  movimentoId: z.string().min(1, 'Il movimento è obbligatorio.'),
});
export type CollegaOccorrenzaInput = z.infer<typeof collegaOccorrenzaSchema>;

export const richiestaElencoOccorrenzeSchema = z.object({
  tutte: z.literal('true').optional(),
});
export type RichiestaElencoOccorrenze = z.infer<
  typeof richiestaElencoOccorrenzeSchema
>;

export const elencoOccorrenzeRispostaSchema = z.object({
  ok: z.literal(true),
  occorrenze: z.array(occorrenzaSchema),
});
export type ElencoOccorrenzeRisposta = z.infer<
  typeof elencoOccorrenzeRispostaSchema
>;

export const occorrenzaRispostaSchema = z.object({
  ok: z.literal(true),
  occorrenza: occorrenzaSchema,
});
export type OccorrenzaRisposta = z.infer<typeof occorrenzaRispostaSchema>;
