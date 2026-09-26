import { z } from 'zod';

import { almenoUnCampo, stringaDataIso } from './comune.js';

const dataRicorrenzaSchema = stringaDataIso('Data non valida: usa YYYY-MM-DD.');

export const regolaRicorrenzaSchema = z.discriminatedUnion('tipo', [
  z.object({
    tipo: z.literal('monthly'),
    anchorDay: z.number().int().min(1).max(31),
    startDate: dataRicorrenzaSchema,
    endDate: dataRicorrenzaSchema.optional(),
  }),
  z.object({
    tipo: z.literal('every_n_months'),
    n: z.number().int().min(1),
    anchorMonth: z.number().int().min(1).max(12),
    anchorDay: z.number().int().min(1).max(31),
    startDate: dataRicorrenzaSchema,
    endDate: dataRicorrenzaSchema.optional(),
  }),
  z.object({
    tipo: z.literal('yearly'),
    anchorMonth: z.number().int().min(1).max(12),
    anchorDay: z.number().int().min(1).max(31),
    startDate: dataRicorrenzaSchema,
    endDate: dataRicorrenzaSchema.optional(),
  }),
]);

const amountCentsSchema = z
  .number()
  .int()
  .refine((amountCents) => amountCents > 0, {
    message: "L'importo della spesa fissa deve essere positivo.",
  });

export const ricorrenzaFissaSchema = z.object({
  id: z.string(),
  nome: z.string(),
  regola: regolaRicorrenzaSchema,
  amountCents: amountCentsSchema,
  contoId: z.string().nullable(),
  categoriaId: z.string(),
  mode: z.enum(['auto', 'manual']),
  active: z.boolean(),
});
export type RicorrenzaFissaDto = z.infer<typeof ricorrenzaFissaSchema>;

export const creaSpesaFissaSchema = z.object({
  nome: z.string().min(1, 'Il nome della spesa fissa è obbligatorio.'),
  regola: regolaRicorrenzaSchema,
  amountCents: amountCentsSchema,
  contoId: z.string().min(1),
  categoriaId: z.string().min(1),
  mode: z.enum(['auto', 'manual']),
  active: z.boolean().default(true),
});
export type CreaSpesaFissaInput = z.infer<typeof creaSpesaFissaSchema>;

export const aggiornaSpesaFissaSchema = almenoUnCampo(
  z.object({
    nome: z
      .string()
      .min(1, 'Il nome della spesa fissa è obbligatorio.')
      .optional(),
    regola: regolaRicorrenzaSchema.optional(),
    amountCents: amountCentsSchema.optional(),
    contoId: z.string().min(1).optional(),
    categoriaId: z.string().min(1).optional(),
    mode: z.enum(['auto', 'manual']).optional(),
    active: z.boolean().optional(),
  }),
);
export type AggiornaSpesaFissaInput = z.infer<typeof aggiornaSpesaFissaSchema>;

export const elencoSpeseFisseRispostaSchema = z.object({
  ok: z.literal(true),
  speseFisse: z.array(ricorrenzaFissaSchema),
});
export type ElencoSpeseFisseRisposta = z.infer<
  typeof elencoSpeseFisseRispostaSchema
>;

export const spesaFissaRispostaSchema = z.object({
  ok: z.literal(true),
  spesaFissa: ricorrenzaFissaSchema,
});
export type SpesaFissaRisposta = z.infer<typeof spesaFissaRispostaSchema>;
