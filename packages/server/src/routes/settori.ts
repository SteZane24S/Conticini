import { aggiornaSettoreSchema, creaSettoreSchema } from '@conticini/contratti';
import type { FastifyInstance } from 'fastify';

import { erroreNonTrovato, erroreValidazione } from '../errori.js';
import { creaRepositorioSettori } from '../repositories/settori.js';
import type { ContestoScrittura } from '../scrittura.js';

export function registraRotteSettori(
  app: FastifyInstance,
  ctx: ContestoScrittura,
): void {
  const repo = creaRepositorioSettori(ctx);

  app.get('/api/settori', async () => ({
    ok: true,
    settori: await repo.elenca(),
  }));

  app.get('/api/settori/:id', async (request) => {
    const { id } = request.params as { id: string };
    const settore = await repo.ottieni(id);
    if (!settore) {
      throw erroreNonTrovato('settore', id);
    }
    return { ok: true, settore };
  });

  app.post('/api/settori', async (request, reply) => {
    const risultato = creaSettoreSchema.safeParse(request.body);
    if (!risultato.success) {
      const issue = risultato.error.issues[0];
      throw erroreValidazione(
        issue?.message ?? 'Richiesta non valida.',
        issue && issue.path.length > 0 ? issue.path.join('.') : undefined,
      );
    }

    const settore = await repo.crea({ nome: risultato.data.nome });
    reply.code(201);
    return { ok: true, settore };
  });

  app.patch('/api/settori/:id', async (request) => {
    const { id } = request.params as { id: string };
    const risultato = aggiornaSettoreSchema.safeParse(request.body);
    if (!risultato.success) {
      const issue = risultato.error.issues[0];
      throw erroreValidazione(
        issue?.message ?? 'Richiesta non valida.',
        issue && issue.path.length > 0 ? issue.path.join('.') : undefined,
      );
    }

    const settore = await repo.aggiorna(id, risultato.data);
    return { ok: true, settore };
  });

  app.delete('/api/settori/:id', async (request) => {
    const { id } = request.params as { id: string };
    await repo.elimina(id);
    return { ok: true };
  });
}
