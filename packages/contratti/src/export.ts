import { z } from 'zod';

import { stringaDataIso } from './comune.js';

export const filtriExportMovimentiSchema = z.object({
  dataDa: stringaDataIso('Data non valida: usa YYYY-MM-DD.').optional(),
  dataA: stringaDataIso('Data non valida: usa YYYY-MM-DD.').optional(),
  contoId: z.string().min(1).optional(),
  settoreId: z.string().min(1).optional(),
  categoriaId: z.string().min(1).optional(),
  testo: z.string().min(1).optional(),
});
export type FiltriExportMovimenti = z.infer<typeof filtriExportMovimentiSchema>;
