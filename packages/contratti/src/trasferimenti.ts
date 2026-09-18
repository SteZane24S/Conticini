import { z } from 'zod';

import { almenoUnCampo, dataIsoRegex, stringaDataIso } from './comune.js';
import { movimentoSchema } from './movimenti.js';

export const trasferimentoSchema = z.object({
  transferGroupId: z.string(),
  data: z.string().regex(dataIsoRegex),
  amountCents: z.number().int().positive(),
  contoOrigineId: z.string(),
  contoDestinazioneId: z.string(),
  descrizione: z.string(),
  movimenti: z.tuple([movimentoSchema, movimentoSchema]),
});
export type TrasferimentoDto = z.infer<typeof trasferimentoSchema>;

export const creaTrasferimentoSchema = z
  .object({
    data: stringaDataIso('Data non valida: usa YYYY-MM-DD.'),
    amountCents: z
      .number()
      .int()
      .positive("L'importo del trasferimento deve essere positivo."),
    contoOrigineId: z.string().min(1, 'Il conto di origine è obbligatorio.'),
    contoDestinazioneId: z
      .string()
      .min(1, 'Il conto di destinazione è obbligatorio.'),
    descrizione: z.string().min(1, 'La descrizione è obbligatoria.'),
  })
  .refine((dati) => dati.contoOrigineId !== dati.contoDestinazioneId, {
    message:
      'Il conto di origine e quello di destinazione devono essere diversi.',
    path: ['contoDestinazioneId'],
  });
export type CreaTrasferimentoInput = z.infer<typeof creaTrasferimentoSchema>;

export const aggiornaTrasferimentoSchema = almenoUnCampo(
  z.object({
    data: stringaDataIso('Data non valida: usa YYYY-MM-DD.').optional(),
    amountCents: z
      .number()
      .int()
      .positive("L'importo del trasferimento deve essere positivo.")
      .optional(),
    contoOrigineId: z.string().min(1).optional(),
    contoDestinazioneId: z.string().min(1).optional(),
    descrizione: z.string().min(1).optional(),
  }),
).refine(
  (dati) =>
    dati.contoOrigineId === undefined ||
    dati.contoDestinazioneId === undefined ||
    dati.contoOrigineId !== dati.contoDestinazioneId,
  {
    message:
      'Il conto di origine e quello di destinazione devono essere diversi.',
    path: ['contoDestinazioneId'],
  },
);
export type AggiornaTrasferimentoInput = z.infer<
  typeof aggiornaTrasferimentoSchema
>;

export const trasferimentoRispostaSchema = z.object({
  ok: z.literal(true),
  trasferimento: trasferimentoSchema,
});
export type TrasferimentoRisposta = z.infer<typeof trasferimentoRispostaSchema>;

export const elencoTrasferimentiRispostaSchema = z.object({
  ok: z.literal(true),
  trasferimenti: z.array(trasferimentoSchema),
});
export type ElencoTrasferimentiRisposta = z.infer<
  typeof elencoTrasferimentiRispostaSchema
>;
