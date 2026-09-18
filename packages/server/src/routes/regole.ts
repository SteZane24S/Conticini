import {
  aggiornaRegolaCategoriaSchema,
  creaRegolaCategoriaSchema,
} from '@conticini/contratti';
import type { FastifyInstance } from 'fastify';

import { erroreNonTrovato, erroreValidazione } from '../errori.js';
import { creaRepositorioRegoleCategoria } from '../repositories/regole.js';
import type { ContestoScrittura } from '../scrittura.js';

export function registraRotteRegole(
  app: FastifyInstance,
  ctx: ContestoScrittura,
): void {
  const repo = creaRepositorioRegoleCategoria(ctx);

  app.get('/api/regole', async () => ({
    ok: true,
    regole: await repo.elenca(),
  }));

  app.get('/api/regole/:id', async (request) => {
    const { id } = request.params as { id: string };
    const regola = await repo.ottieni(id);
    if (!regola) {
      throw erroreNonTrovato('regola', id);
    }
    return { ok: true, regola };
  });

  app.post('/api/regole', async (request, reply) => {
    const risultato = creaRegolaCategoriaSchema.safeParse(request.body);
    if (!risultato.success) {
      const issue = risultato.error.issues[0];
      throw erroreValidazione(
        issue?.message ?? 'Richiesta non valida.',
        issue && issue.path.length > 0 ? issue.path.join('.') : undefined,
      );
    }

    const regola = await repo.crea(risultato.data);
    reply.code(201);
    return { ok: true, regola };
  });

  app.patch('/api/regole/:id', async (request) => {
    const { id } = request.params as { id: string };
    const risultato = aggiornaRegolaCategoriaSchema.safeParse(request.body);
    if (!risultato.success) {
      const issue = risultato.error.issues[0];
      throw erroreValidazione(
        issue?.message ?? 'Richiesta non valida.',
        issue && issue.path.length > 0 ? issue.path.join('.') : undefined,
      );
    }

    const regola = await repo.aggiorna(id, risultato.data);
    return { ok: true, regola };
  });

  app.delete('/api/regole/:id', async (request) => {
    const { id } = request.params as { id: string };
    await repo.elimina(id);
    return { ok: true };
  });
}
