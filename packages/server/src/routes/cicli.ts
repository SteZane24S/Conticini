import { aggiornaCicloSchema } from '@conticini/contratti';
import type { FastifyInstance } from 'fastify';

import { erroreValidazione } from '../errori.js';
import { creaRepositorioCicli } from '../repositories/cicli.js';
import type { ContestoScrittura } from '../scrittura.js';

export function registraRotteCicli(
  app: FastifyInstance,
  ctx: ContestoScrittura,
): void {
  const repo = creaRepositorioCicli(ctx);

  app.get('/api/cicli', async () => ({ ok: true, cicli: await repo.elenca() }));

  app.patch('/api/cicli/:id', async (request) => {
    const { id } = request.params as { id: string };
    const risultato = aggiornaCicloSchema.safeParse(request.body);
    if (!risultato.success) {
      const issue = risultato.error.issues[0];
      throw erroreValidazione(
        issue?.message ?? 'Richiesta non valida.',
        issue && issue.path.length > 0 ? issue.path.join('.') : undefined,
      );
    }

    const ciclo = await repo.aggiorna(id, risultato.data);
    return { ok: true, ciclo };
  });
}
