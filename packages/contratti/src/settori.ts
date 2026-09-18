import { z } from 'zod';

import { almenoUnCampo } from './comune.js';

export const settoreSchema = z.object({
  id: z.string(),
  nome: z.string(),
});
export type SettoreDto = z.infer<typeof settoreSchema>;

export const creaSettoreSchema = z.object({
  nome: z.string().min(1, 'Il nome del settore è obbligatorio.'),
});
export type CreaSettoreInput = z.infer<typeof creaSettoreSchema>;

export const aggiornaSettoreSchema = almenoUnCampo(
  z.object({
    nome: z.string().min(1, 'Il nome del settore è obbligatorio.').optional(),
  }),
);
export type AggiornaSettoreInput = z.infer<typeof aggiornaSettoreSchema>;

export const elencoSettoriRispostaSchema = z.object({
  ok: z.literal(true),
  settori: z.array(settoreSchema),
});
export type ElencoSettoriRisposta = z.infer<typeof elencoSettoriRispostaSchema>;

export const settoreRispostaSchema = z.object({
  ok: z.literal(true),
  settore: settoreSchema,
});
export type SettoreRisposta = z.infer<typeof settoreRispostaSchema>;
