import {
  collegaOccorrenzaSchema,
  confermaOccorrenzaSchema,
  richiestaElencoOccorrenzeSchema,
} from '@conticini/contratti';
import type { FastifyInstance } from 'fastify';

import { erroreValidazione } from '../errori.js';
import {
  collegaOccorrenza,
  confermaOccorrenza,
  creaRepositorioOccorrenze,
  elencaOccorrenzePending,
  saltaOccorrenza,
} from '../repositories/occorrenze.js';
import type { ContestoScrittura } from '../scrittura.js';

export function registraRotteOccorrenze(
  app: FastifyInstance,
  ctx: ContestoScrittura,
): void {
  app.get('/api/occorrenze', async (request) => {
    const risultato = richiestaElencoOccorrenzeSchema.safeParse(request.query);
    if (!risultato.success) {
      const issue = risultato.error.issues[0];
      throw erroreValidazione(
        issue?.message ?? 'Richiesta non valida.',
        issue && issue.path.length > 0 ? issue.path.join('.') : undefined,
      );
    }
    return {
      ok: true,
      occorrenze:
        risultato.data.tutte === 'true'
          ? await creaRepositorioOccorrenze(ctx).elenca()
          : elencaOccorrenzePending(ctx),
    };
  });

  app.post('/api/occorrenze/:id/conferma', async (request) => {
    const { id } = request.params as { id: string };
    const risultato = confermaOccorrenzaSchema.safeParse(request.body);
    if (!risultato.success) {
      const issue = risultato.error.issues[0];
      throw erroreValidazione(
        issue?.message ?? 'Richiesta non valida.',
        issue && issue.path.length > 0 ? issue.path.join('.') : undefined,
      );
    }

    const occorrenza = confermaOccorrenza(ctx, id, risultato.data);
    return { ok: true, occorrenza };
  });

  app.post('/api/occorrenze/:id/salta', async (request) => {
    const { id } = request.params as { id: string };
    const occorrenza = saltaOccorrenza(ctx, id);
    return { ok: true, occorrenza };
  });

  app.post('/api/occorrenze/:id/collega', async (request) => {
    const { id } = request.params as { id: string };
    const risultato = collegaOccorrenzaSchema.safeParse(request.body);
    if (!risultato.success) {
      const issue = risultato.error.issues[0];
      throw erroreValidazione(
        issue?.message ?? 'Richiesta non valida.',
        issue && issue.path.length > 0 ? issue.path.join('.') : undefined,
      );
    }

    const occorrenza = collegaOccorrenza(ctx, id, risultato.data.movimentoId);
    return { ok: true, occorrenza };
  });
}
