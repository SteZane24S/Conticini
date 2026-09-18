import { z } from 'zod';

import { cicloSchema } from './cicli.js';
import { stringaDataIso } from './comune.js';
import { movimentoSchema } from './movimenti.js';

export const creaStipendioSchema = z.object({
  data: stringaDataIso('Data non valida: usa YYYY-MM-DD.'),
  amountCents: z
    .number()
    .int()
    .refine((v) => v > 0, {
      message: "L'importo dello stipendio deve essere positivo.",
    }),
  contoId: z.string().min(1, 'Il conto è obbligatorio.'),
  categoriaId: z.string().min(1, 'La categoria è obbligatoria.'),
  descrizione: z.string().min(1, 'La descrizione è obbligatoria.'),
  expectedNextDate: stringaDataIso('Data non valida: usa YYYY-MM-DD.'),
  expectedAmountCents: z.number().int().optional(),
});
export type CreaStipendioInput = z.infer<typeof creaStipendioSchema>;

export const stipendioRispostaSchema = z.object({
  ok: z.literal(true),
  movimento: movimentoSchema,
  ciclo: cicloSchema,
});
export type StipendioRisposta = z.infer<typeof stipendioRispostaSchema>;
