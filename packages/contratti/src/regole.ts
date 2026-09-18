import { z } from 'zod';

import { almenoUnCampo } from './comune.js';

export const regolaCategoriaSchema = z.object({
  id: z.string(),
  pattern: z.string(),
  categoriaId: z.string(),
  priority: z.number().int(),
  active: z.boolean(),
});
export type RegolaCategoriaDto = z.infer<typeof regolaCategoriaSchema>;

export const creaRegolaCategoriaSchema = z.object({
  pattern: z.string().min(1, 'Il pattern della regola è obbligatorio.'),
  categoriaId: z.string().min(1),
  priority: z.number().int().default(0),
  active: z.boolean().default(true),
});
export type CreaRegolaCategoriaInput = z.infer<
  typeof creaRegolaCategoriaSchema
>;

export const aggiornaRegolaCategoriaSchema = almenoUnCampo(
  z.object({
    pattern: z
      .string()
      .min(1, 'Il pattern della regola è obbligatorio.')
      .optional(),
    categoriaId: z.string().min(1).optional(),
    priority: z.number().int().optional(),
    active: z.boolean().optional(),
  }),
);
export type AggiornaRegolaCategoriaInput = z.infer<
  typeof aggiornaRegolaCategoriaSchema
>;

export const elencoRegoleCategoriaRispostaSchema = z.object({
  ok: z.literal(true),
  regole: z.array(regolaCategoriaSchema),
});
export type ElencoRegoleCategoriaRisposta = z.infer<
  typeof elencoRegoleCategoriaRispostaSchema
>;

export const regolaCategoriaRispostaSchema = z.object({
  ok: z.literal(true),
  regola: regolaCategoriaSchema,
});
export type RegolaCategoriaRisposta = z.infer<
  typeof regolaCategoriaRispostaSchema
>;

export const filtriSuggerimentiSchema = z.object({
  testo: z.string().min(1, 'Il testo di ricerca è obbligatorio.'),
  limite: z.coerce.number().int().min(1).max(50).default(10),
});
export type FiltriSuggerimenti = z.infer<typeof filtriSuggerimentiSchema>;

export const suggerimentoDescrizioneSchema = z.object({
  descrizione: z.string(),
  categoriaId: z.string().nullable(),
  amountCentsRecente: z.number().int(),
});
export type SuggerimentoDescrizioneDto = z.infer<
  typeof suggerimentoDescrizioneSchema
>;

export const suggerimentiRispostaSchema = z.object({
  ok: z.literal(true),
  suggerimenti: z.array(suggerimentoDescrizioneSchema),
  categoriaSuggerita: z.string().nullable(),
});
export type SuggerimentiRisposta = z.infer<typeof suggerimentiRispostaSchema>;
