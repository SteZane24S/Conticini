import { z } from 'zod';

import { almenoUnCampo } from './comune.js';

export const tipoCategoriaSchema = z.enum(['entrata', 'uscita']);

export const categoriaSchema = z.object({
  id: z.string(),
  nome: z.string(),
  kind: tipoCategoriaSchema,
  settoreId: z.string(),
});
export type CategoriaDto = z.infer<typeof categoriaSchema>;

export const creaCategoriaSchema = z
  .object({
    nome: z.string().min(1, 'Il nome della categoria è obbligatorio.'),
    kind: tipoCategoriaSchema,
    settoreId: z.string().min(1).optional(),
    settoreNome: z.string().min(1).optional(),
  })
  .refine(
    (dati) =>
      (dati.settoreId === undefined) !== (dati.settoreNome === undefined),
    {
      message: 'Indica esattamente uno tra settoreId e settoreNome.',
    },
  );
export type CreaCategoriaInput = z.infer<typeof creaCategoriaSchema>;

export const aggiornaCategoriaSchema = almenoUnCampo(
  z.object({
    nome: z
      .string()
      .min(1, 'Il nome della categoria è obbligatorio.')
      .optional(),
    kind: tipoCategoriaSchema.optional(),
    settoreId: z.string().min(1).optional(),
  }),
);
export type AggiornaCategoriaInput = z.infer<typeof aggiornaCategoriaSchema>;

export const elencoCategorieRispostaSchema = z.object({
  ok: z.literal(true),
  categorie: z.array(categoriaSchema),
});
export type ElencoCategorieRisposta = z.infer<
  typeof elencoCategorieRispostaSchema
>;

export const categoriaRispostaSchema = z.object({
  ok: z.literal(true),
  categoria: categoriaSchema,
});
export type CategoriaRisposta = z.infer<typeof categoriaRispostaSchema>;
