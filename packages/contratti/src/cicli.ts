import { z } from 'zod';

import { almenoUnCampo, dataIsoRegex, stringaDataIso } from './comune.js';

export const cicloSchema = z.object({
  id: z.string(),
  startDate: z.string().regex(dataIsoRegex),
  expectedNextDate: z.string().regex(dataIsoRegex).nullable(),
  expectedAmountCents: z.number().int().nullable(),
  salaryTransactionId: z.string(),
});
export type CicloDto = z.infer<typeof cicloSchema>;

export const aggiornaCicloSchema = almenoUnCampo(
  z.object({
    expectedNextDate: stringaDataIso(
      'Data non valida: usa YYYY-MM-DD.',
    ).optional(),
    expectedAmountCents: z.number().int().optional(),
  }),
);
export type AggiornaCicloInput = z.infer<typeof aggiornaCicloSchema>;

export const cicloRispostaSchema = z.object({
  ok: z.literal(true),
  ciclo: cicloSchema,
});
export type CicloRisposta = z.infer<typeof cicloRispostaSchema>;

export const elencoCicliRispostaSchema = z.object({
  ok: z.literal(true),
  cicli: z.array(cicloSchema),
});
export type ElencoCicliRisposta = z.infer<typeof elencoCicliRispostaSchema>;
