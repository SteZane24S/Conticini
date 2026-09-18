import { z } from 'zod';

export const erroreApiSchema = z.object({
  ok: z.literal(false),
  errore: z.object({
    codice: z.string(),
    messaggio: z.string(),
    campo: z.string().optional(),
  }),
});
export type ErroreApiDto = z.infer<typeof erroreApiSchema>;
