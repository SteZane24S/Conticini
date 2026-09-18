import { filtriSuggerimentiSchema } from '@conticini/contratti';
import {
  suggerimentiDescrizione as suggerimentiDescrizioneDominio,
  suggerisciCategoria as suggerisciCategoriaDominio,
} from '@conticini/dominio';
import type { FastifyInstance } from 'fastify';

import { erroreValidazione } from '../errori.js';
import { leggiRegoleEStoricoApprendimento } from '../repositories/apprendimento.js';
import type { ContestoScrittura } from '../scrittura.js';

export function registraRotteSuggerimenti(
  app: FastifyInstance,
  ctx: ContestoScrittura,
): void {
  app.get('/api/suggerimenti', async (request) => {
    const risultato = filtriSuggerimentiSchema.safeParse(request.query);
    if (!risultato.success) {
      const issue = risultato.error.issues[0];
      throw erroreValidazione(
        issue?.message ?? 'Richiesta non valida.',
        issue && issue.path.length > 0 ? issue.path.join('.') : undefined,
      );
    }

    const { regole, storico } = leggiRegoleEStoricoApprendimento(ctx);
    const suggerimenti = suggerimentiDescrizioneDominio(
      risultato.data.testo,
      storico,
      risultato.data.limite,
    );
    const categoriaSuggerita = suggerisciCategoriaDominio(
      risultato.data.testo,
      regole,
      storico,
    );

    return { ok: true, suggerimenti, categoriaSuggerita };
  });
}
