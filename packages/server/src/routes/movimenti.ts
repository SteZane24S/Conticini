import {
  aggiornaMovimentoSchema,
  creaMovimentoSchema,
  filtriMovimentiSchema,
} from '@conticini/contratti';
import type { MovimentoConDettagli } from '@conticini/dominio';
import type { FastifyInstance } from 'fastify';

import { erroreNonTrovato, erroreValidazione } from '../errori.js';
import {
  cercaMovimenti,
  creaRepositorioMovimenti,
} from '../repositories/movimenti.js';
import type { ContestoScrittura } from '../scrittura.js';

export function registraRotteMovimenti(
  app: FastifyInstance,
  ctx: ContestoScrittura,
): void {
  const repo = creaRepositorioMovimenti(ctx);

  app.get('/api/movimenti', async (request) => {
    const risultato = filtriMovimentiSchema.safeParse(request.query);
    if (!risultato.success) {
      const issue = risultato.error.issues[0];
      throw erroreValidazione(
        issue?.message ?? 'Richiesta non valida.',
        issue && issue.path.length > 0 ? issue.path.join('.') : undefined,
      );
    }

    const { pagina, perPagina, ...filtri } = risultato.data;
    const elenco = cercaMovimenti(ctx, filtri, { pagina, perPagina });
    return {
      ok: true,
      movimenti: elenco.elementi,
      totale: elenco.totale,
      pagina,
      perPagina,
    };
  });

  app.get('/api/movimenti/:id', async (request) => {
    const { id } = request.params as { id: string };
    const movimento = await repo.ottieni(id);
    if (!movimento) {
      throw erroreNonTrovato('movimento', id);
    }
    return { ok: true, movimento };
  });

  app.post('/api/movimenti', async (request, reply) => {
    const risultato = creaMovimentoSchema.safeParse(request.body);
    if (!risultato.success) {
      const issue = risultato.error.issues[0];
      throw erroreValidazione(
        issue?.message ?? 'Richiesta non valida.',
        issue && issue.path.length > 0 ? issue.path.join('.') : undefined,
      );
    }

    const movimento = await repo.crea({
      data: risultato.data.data,
      amountCents: risultato.data.amountCents,
      contoId: risultato.data.contoId,
      categoriaId: risultato.data.categoriaId,
      descrizione: risultato.data.descrizione,
    });
    reply.code(201);
    return { ok: true, movimento };
  });

  app.patch('/api/movimenti/:id', async (request) => {
    const { id } = request.params as { id: string };
    const risultato = aggiornaMovimentoSchema.safeParse(request.body);
    if (!risultato.success) {
      const issue = risultato.error.issues[0];
      throw erroreValidazione(
        issue?.message ?? 'Richiesta non valida.',
        issue && issue.path.length > 0 ? issue.path.join('.') : undefined,
      );
    }

    const movimento = await repo.aggiorna(
      id,
      risultato.data as Partial<Omit<MovimentoConDettagli, 'id'>>,
    );
    return { ok: true, movimento };
  });

  app.delete('/api/movimenti/:id', async (request) => {
    const { id } = request.params as { id: string };
    await repo.elimina(id);
    return { ok: true };
  });
}
