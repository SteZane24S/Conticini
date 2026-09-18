import { creaStipendioSchema } from '@conticini/contratti';
import type { FastifyInstance } from 'fastify';

import { erroreValidazione } from '../errori.js';
import { creaStipendio } from '../repositories/stipendi.js';
import type { ContestoScrittura } from '../scrittura.js';

export function registraRotteStipendi(
  app: FastifyInstance,
  ctx: ContestoScrittura,
): void {
  app.post('/api/stipendi', async (request, reply) => {
    const risultato = creaStipendioSchema.safeParse(request.body);
    if (!risultato.success) {
      const issue = risultato.error.issues[0];
      throw erroreValidazione(
        issue?.message ?? 'Richiesta non valida.',
        issue && issue.path.length > 0 ? issue.path.join('.') : undefined,
      );
    }

    const stipendio = creaStipendio(ctx, risultato.data);
    reply.code(201);
    return { ok: true, ...stipendio };
  });
}
