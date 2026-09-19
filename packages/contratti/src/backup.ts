import { z } from 'zod';

import { almenoUnCampo } from './comune.js';

export const impostazioniBackupSchema = z.object({
  cartella: z.string().min(1),
  rotazione: z.number().int().min(1).max(365),
});
export type ImpostazioniBackupDto = z.infer<typeof impostazioniBackupSchema>;

export const aggiornaImpostazioniBackupSchema = almenoUnCampo(
  z.object({
    cartella: z.string().min(1).optional(),
    rotazione: z.number().int().min(1).max(365).optional(),
  }),
);
export type AggiornaImpostazioniBackupInput = z.infer<
  typeof aggiornaImpostazioniBackupSchema
>;

export const impostazioniBackupRispostaSchema = z.object({
  ok: z.literal(true),
  impostazioni: impostazioniBackupSchema,
});
export type ImpostazioniBackupRisposta = z.infer<
  typeof impostazioniBackupRispostaSchema
>;

export const voceBackupSchema = z.object({
  nomeFile: z.string(),
  quando: z.string(),
  dimensioneByte: z.number().int(),
});
export type VoceBackupDto = z.infer<typeof voceBackupSchema>;

export const statoBackupRispostaSchema = z.object({
  ok: z.literal(true),
  impostazioni: impostazioniBackupSchema,
  backups: z.array(voceBackupSchema),
  ultimo: voceBackupSchema.nullable(),
  ultimoVecchio: z.boolean(),
});
export type StatoBackupRisposta = z.infer<typeof statoBackupRispostaSchema>;

export const eseguiBackupRispostaSchema = z.object({
  ok: z.literal(true),
  backup: voceBackupSchema,
});
export type EseguiBackupRisposta = z.infer<typeof eseguiBackupRispostaSchema>;

export const ripristinaBackupSchema = z.object({
  nomeFile: z.string().min(1, 'Il nome del file è obbligatorio.'),
});
export type RipristinaBackupInput = z.infer<typeof ripristinaBackupSchema>;
