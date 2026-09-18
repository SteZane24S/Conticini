import {
  aggiornaSpesaFissaSchema,
  creaSpesaFissaSchema,
} from '@conticini/contratti';
import type { FastifyInstance } from 'fastify';

import { erroreNonTrovato, erroreValidazione } from '../errori.js';
import { creaRepositorioSpeseFisse } from '../repositories/speseFisse.js';
import type { ContestoScrittura } from '../scrittura.js';

export function registraRotteSpeseFisse(
  app: FastifyInstance,
  ctx: ContestoScrittura,
): void {
  const repo = creaRepositorioSpeseFisse(ctx);

  app.get('/api/spese-fisse', async () => ({
    ok: true,
    speseFisse: await repo.elenca(),
  }));

  app.get('/api/spese-fisse/:id', async (request) => {
    const { id } = request.params as { id: string };
    const spesaFissa = await repo.ottieni(id);
    if (!spesaFissa) {
      throw erroreNonTrovato('spesa fissa', id);
    }
    return { ok: true, spesaFissa };
  });

  app.post('/api/spese-fisse', async (request, reply) => {
    const risultato = creaSpesaFissaSchema.safeParse(request.body);
    if (!risultato.success) {
      const issue = risultato.error.issues[0];
      throw erroreValidazione(
        issue?.message ?? 'Richiesta non valida.',
        issue && issue.path.length > 0 ? issue.path.join('.') : undefined,
      );
    }

    const spesaFissa = await repo.crea(risultato.data);
    reply.code(201);
    return { ok: true, spesaFissa };
  });

  app.patch('/api/spese-fisse/:id', async (request) => {
    const { id } = request.params as { id: string };
    const risultato = aggiornaSpesaFissaSchema.safeParse(request.body);
    if (!risultato.success) {
      const issue = risultato.error.issues[0];
      throw erroreValidazione(
        issue?.message ?? 'Richiesta non valida.',
        issue && issue.path.length > 0 ? issue.path.join('.') : undefined,
      );
    }

    const spesaFissa = await repo.aggiorna(id, risultato.data);
    return { ok: true, spesaFissa };
  });

  app.delete('/api/spese-fisse/:id', async (request) => {
    const { id } = request.params as { id: string };
    await repo.elimina(id);
    return { ok: true };
  });
}
