import { z } from 'zod';

import { almenoUnCampo, dataIsoRegex, stringaDataIso } from './comune.js';

export const movimentoSchema = z.object({
  id: z.string(),
  data: z.string().regex(dataIsoRegex),
  amountCents: z.number().int(),
  contoId: z.string(),
  categoriaId: z.string().nullable(),
  transferGroupId: z.string().nullable(),
  descrizione: z.string(),
  descrizioneNorm: z.string(),
});
export type MovimentoDto = z.infer<typeof movimentoSchema>;

export const creaMovimentoSchema = z.object({
  data: stringaDataIso('Data non valida: usa YYYY-MM-DD.'),
  amountCents: z
    .number()
    .int()
    .refine((v) => v !== 0, { message: "L'importo non può essere zero." }),
  contoId: z.string().min(1, 'Il conto è obbligatorio.'),
  categoriaId: z.string().min(1, 'La categoria è obbligatoria.'),
  descrizione: z.string().min(1, 'La descrizione è obbligatoria.'),
});
export type CreaMovimentoInput = z.infer<typeof creaMovimentoSchema>;

export const aggiornaMovimentoSchema = almenoUnCampo(
  z.object({
    data: stringaDataIso('Data non valida: usa YYYY-MM-DD.').optional(),
    amountCents: z
      .number()
      .int()
      .refine((v) => v !== 0, { message: "L'importo non può essere zero." })
      .optional(),
    contoId: z.string().min(1).optional(),
    categoriaId: z.string().min(1).optional(),
    descrizione: z.string().min(1).optional(),
  }),
);
export type AggiornaMovimentoInput = z.infer<typeof aggiornaMovimentoSchema>;

export const filtriMovimentiSchema = z.object({
  dataDa: stringaDataIso('Data non valida: usa YYYY-MM-DD.').optional(),
  dataA: stringaDataIso('Data non valida: usa YYYY-MM-DD.').optional(),
  contoId: z.string().min(1).optional(),
  settoreId: z.string().min(1).optional(),
  categoriaId: z.string().min(1).optional(),
  testo: z.string().min(1).optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  perPagina: z.coerce.number().int().min(1).max(200).default(50),
});
export type FiltriMovimenti = z.infer<typeof filtriMovimentiSchema>;

export const elencoMovimentiRispostaSchema = z.object({
  ok: z.literal(true),
  movimenti: z.array(movimentoSchema),
  totale: z.number().int(),
  pagina: z.number().int(),
  perPagina: z.number().int(),
});
export type ElencoMovimentiRisposta = z.infer<
  typeof elencoMovimentiRispostaSchema
>;

export const movimentoRispostaSchema = z.object({
  ok: z.literal(true),
  movimento: movimentoSchema,
});
export type MovimentoRisposta = z.infer<typeof movimentoRispostaSchema>;
