import { z } from 'zod';

import { dataIsoRegex, stringaDataIso } from './comune.js';

export const rigaCategoriaSpesaSchema = z.object({
  categoriaId: z.string(),
  speseCents: z.number().int(),
});

export const rigaSettoreSpesaSchema = z.object({
  settoreId: z.string(),
  speseCents: z.number().int(),
  categorie: z.array(rigaCategoriaSpesaSchema),
});

export const richiestaSpesePerSettoreSchema = z
  .object({
    cicloId: z.string().min(1).optional(),
    dataInizio: stringaDataIso('Data non valida: usa YYYY-MM-DD.').optional(),
    dataFine: stringaDataIso('Data non valida: usa YYYY-MM-DD.').optional(),
  })
  .refine(
    (dati) =>
      dati.cicloId === undefined ||
      (dati.dataInizio === undefined && dati.dataFine === undefined),
    {
      message:
        'Indica esattamente uno tra cicloId e la coppia dataInizio/dataFine.',
    },
  )
  .refine(
    (dati) =>
      dati.cicloId !== undefined ||
      (dati.dataInizio !== undefined && dati.dataFine !== undefined),
    {
      message:
        'Indica esattamente uno tra cicloId e la coppia dataInizio/dataFine.',
    },
  )
  .refine(
    (dati) =>
      dati.dataInizio === undefined ||
      dati.dataFine === undefined ||
      dati.dataInizio <= dati.dataFine,
    {
      message: 'dataFine deve essere successiva o uguale a dataInizio.',
    },
  );
export type RichiestaSpesePerSettore = z.infer<
  typeof richiestaSpesePerSettoreSchema
>;

export const spesePerSettoreRispostaSchema = z.object({
  ok: z.literal(true),
  settori: z.array(rigaSettoreSpesaSchema),
});
export type SpesePerSettoreRisposta = z.infer<
  typeof spesePerSettoreRispostaSchema
>;

export const puntoSaldoGiornalieroSchema = z.object({
  data: z.string().regex(dataIsoRegex),
  saldoCents: z.number().int(),
});

export const richiestaSaldoGiornalieroSchema = z
  .object({
    dataInizio: stringaDataIso('Data non valida: usa YYYY-MM-DD.'),
    dataFine: stringaDataIso('Data non valida: usa YYYY-MM-DD.'),
  })
  .refine((dati) => dati.dataInizio <= dati.dataFine, {
    message: 'dataFine deve essere successiva o uguale a dataInizio.',
  });
export type RichiestaSaldoGiornaliero = z.infer<
  typeof richiestaSaldoGiornalieroSchema
>;

export const saldoGiornalieroRispostaSchema = z.object({
  ok: z.literal(true),
  punti: z.array(puntoSaldoGiornalieroSchema),
});
export type SaldoGiornalieroRisposta = z.infer<
  typeof saldoGiornalieroRispostaSchema
>;

export const rigaCategoriaPrevistoSpesoSchema = z.object({
  categoriaId: z.string(),
  previstoCents: z.number().int(),
  speseCents: z.number().int(),
});

export const richiestaPrevistoSpesoSchema = z.object({
  cicloId: z.string().min(1, 'cicloId è obbligatorio.'),
});
export type RichiestaPrevistoSpeso = z.infer<
  typeof richiestaPrevistoSpesoSchema
>;

export const previstoSpesoRispostaSchema = z.object({
  ok: z.literal(true),
  cicloId: z.string(),
  previstoTotaleCents: z.number().int(),
  speseTotaleCents: z.number().int(),
  categorie: z.array(rigaCategoriaPrevistoSpesoSchema),
});
export type PrevistoSpesoRisposta = z.infer<typeof previstoSpesoRispostaSchema>;
