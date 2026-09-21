import {
  aggiornaPosizioneSchema,
  creaPosizioneSchema,
  creaSaldamentoSchema,
} from '@conticini/contratti';
import type { FastifyInstance } from 'fastify';

import { erroreNonTrovato, erroreValidazione } from '../errori.js';
import {
  annullaSaldamento,
  creaRepositorioPosizioni,
  saldaPosizione,
} from '../repositories/posizioni.js';
import type { ContestoScrittura } from '../scrittura.js';

export function registraRottePosizioni(
  app: FastifyInstance,
  ctx: ContestoScrittura,
): void {
  const repo = creaRepositorioPosizioni(ctx);

  app.get('/api/posizioni', async () => ({
    ok: true,
    posizioni: await repo.elenca(),
  }));

  app.get('/api/posizioni/:id', async (request) => {
    const { id } = request.params as { id: string };
    const posizione = await repo.ottieni(id);
    if (!posizione) {
      throw erroreNonTrovato('posizione', id);
    }
    return { ok: true, posizione };
  });

  app.post('/api/posizioni', async (request, reply) => {
    const risultato = creaPosizioneSchema.safeParse(request.body);
    if (!risultato.success) {
      const issue = risultato.error.issues[0];
      throw erroreValidazione(
        issue?.message ?? 'Richiesta non valida.',
        issue && issue.path.length > 0 ? issue.path.join('.') : undefined,
      );
    }

    const importoInizialeCents =
      risultato.data.verso === 'debito'
        ? -risultato.data.importoCents
        : risultato.data.importoCents;
    const posizione = await repo.crea({
      descrizione: risultato.data.descrizione,
      verso: risultato.data.verso,
      importoInizialeCents,
    });
    reply.code(201);
    return { ok: true, posizione };
  });

  app.patch('/api/posizioni/:id', async (request) => {
    const { id } = request.params as { id: string };
    const risultato = aggiornaPosizioneSchema.safeParse(request.body);
    if (!risultato.success) {
      const issue = risultato.error.issues[0];
      throw erroreValidazione(
        issue?.message ?? 'Richiesta non valida.',
        issue && issue.path.length > 0 ? issue.path.join('.') : undefined,
      );
    }

    const posizione = await repo.aggiorna(id, risultato.data);
    return { ok: true, posizione };
  });

  app.delete('/api/posizioni/:id', async (request) => {
    const { id } = request.params as { id: string };
    await repo.elimina(id);
    return { ok: true };
  });

  app.post('/api/posizioni/:id/salda', async (request, reply) => {
    const { id } = request.params as { id: string };
    const risultato = creaSaldamentoSchema.safeParse(request.body);
    if (!risultato.success) {
      const issue = risultato.error.issues[0];
      throw erroreValidazione(
        issue?.message ?? 'Richiesta non valida.',
        issue && issue.path.length > 0 ? issue.path.join('.') : undefined,
      );
    }

    const { movimento, posizione } = saldaPosizione(ctx, id, risultato.data);
    reply.code(201);
    return { ok: true, movimento, posizione };
  });

  app.post(
    '/api/posizioni/saldamenti/:movimentoId/annulla',
    async (request) => {
      const { movimentoId } = request.params as { movimentoId: string };
      const posizione = annullaSaldamento(ctx, movimentoId);
      return { ok: true, posizione };
    },
  );
}
