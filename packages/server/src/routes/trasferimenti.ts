import {
  aggiornaTrasferimentoSchema,
  creaTrasferimentoSchema,
} from '@conticini/contratti';
import type { FastifyInstance } from 'fastify';

import { erroreNonTrovato, erroreValidazione } from '../errori.js';
import {
  aggiornaTrasferimento,
  creaTrasferimento,
  eliminaTrasferimento,
  ottieniTrasferimento,
} from '../repositories/trasferimenti.js';
import type { ContestoScrittura } from '../scrittura.js';

export function registraRotteTrasferimenti(
  app: FastifyInstance,
  ctx: ContestoScrittura,
): void {
  app.post('/api/trasferimenti', async (request, reply) => {
    const risultato = creaTrasferimentoSchema.safeParse(request.body);
    if (!risultato.success) {
      const issue = risultato.error.issues[0];
      throw erroreValidazione(
        issue?.message ?? 'Richiesta non valida.',
        issue && issue.path.length > 0 ? issue.path.join('.') : undefined,
      );
    }

    const trasferimento = creaTrasferimento(ctx, risultato.data);
    reply.code(201);
    return { ok: true, trasferimento };
  });

  app.get('/api/trasferimenti/:gruppo', async (request) => {
    const { gruppo } = request.params as { gruppo: string };
    const trasferimento = ottieniTrasferimento(ctx, gruppo);
    if (!trasferimento) {
      throw erroreNonTrovato('trasferimento', gruppo);
    }
    return { ok: true, trasferimento };
  });

  app.put('/api/trasferimenti/:gruppo', async (request) => {
    const { gruppo } = request.params as { gruppo: string };
    const risultato = aggiornaTrasferimentoSchema.safeParse(request.body);
    if (!risultato.success) {
      const issue = risultato.error.issues[0];
      throw erroreValidazione(
        issue?.message ?? 'Richiesta non valida.',
        issue && issue.path.length > 0 ? issue.path.join('.') : undefined,
      );
    }

    const trasferimento = aggiornaTrasferimento(ctx, gruppo, risultato.data);
    return { ok: true, trasferimento };
  });

  app.delete('/api/trasferimenti/:gruppo', async (request) => {
    const { gruppo } = request.params as { gruppo: string };
    eliminaTrasferimento(ctx, gruppo);
    return { ok: true };
  });
}
