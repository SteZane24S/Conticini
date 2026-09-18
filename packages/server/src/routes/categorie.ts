import {
  aggiornaCategoriaSchema,
  creaCategoriaSchema,
} from '@conticini/contratti';
import type { FastifyInstance } from 'fastify';

import { erroreNonTrovato, erroreValidazione } from '../errori.js';
import {
  creaCategoriaConSettoreEventuale,
  creaRepositorioCategorie,
} from '../repositories/categorie.js';
import type { ContestoScrittura } from '../scrittura.js';

export function registraRotteCategorie(
  app: FastifyInstance,
  ctx: ContestoScrittura,
): void {
  const repo = creaRepositorioCategorie(ctx);

  app.get('/api/categorie', async () => ({
    ok: true,
    categorie: await repo.elenca(),
  }));

  app.get('/api/categorie/:id', async (request) => {
    const { id } = request.params as { id: string };
    const categoria = await repo.ottieni(id);
    if (!categoria) {
      throw erroreNonTrovato('categoria', id);
    }
    return { ok: true, categoria };
  });

  app.post('/api/categorie', async (request, reply) => {
    const risultato = creaCategoriaSchema.safeParse(request.body);
    if (!risultato.success) {
      const issue = risultato.error.issues[0];
      throw erroreValidazione(
        issue?.message ?? 'Richiesta non valida.',
        issue && issue.path.length > 0 ? issue.path.join('.') : undefined,
      );
    }

    const categoria = await creaCategoriaConSettoreEventuale(
      ctx,
      risultato.data,
    );
    reply.code(201);
    return { ok: true, categoria };
  });

  app.patch('/api/categorie/:id', async (request) => {
    const { id } = request.params as { id: string };
    const risultato = aggiornaCategoriaSchema.safeParse(request.body);
    if (!risultato.success) {
      const issue = risultato.error.issues[0];
      throw erroreValidazione(
        issue?.message ?? 'Richiesta non valida.',
        issue && issue.path.length > 0 ? issue.path.join('.') : undefined,
      );
    }

    const categoria = await repo.aggiorna(id, risultato.data);
    return { ok: true, categoria };
  });

  app.delete('/api/categorie/:id', async (request) => {
    const { id } = request.params as { id: string };
    await repo.elimina(id);
    return { ok: true };
  });
}
