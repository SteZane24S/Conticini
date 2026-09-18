import { aggiornaContoSchema, creaContoSchema } from '@conticini/contratti';
import type { ContoConDettagli, DataISO } from '@conticini/dominio';
import type { FastifyInstance } from 'fastify';

import { erroreNonTrovato, erroreValidazione } from '../errori.js';
import { creaRepositorioConti } from '../repositories/conti.js';
import type { ContestoScrittura } from '../scrittura.js';

export function registraRotteConti(
  app: FastifyInstance,
  ctx: ContestoScrittura,
): void {
  const repo = creaRepositorioConti(ctx);

  app.get('/api/conti', async () => ({
    ok: true,
    conti: await repo.elenca(),
  }));

  app.get('/api/conti/:id', async (request) => {
    const { id } = request.params as { id: string };
    const conto = await repo.ottieni(id);
    if (!conto) {
      throw erroreNonTrovato('conto', id);
    }
    return { ok: true, conto };
  });

  app.post('/api/conti', async (request, reply) => {
    const risultato = creaContoSchema.safeParse(request.body);
    if (!risultato.success) {
      const issue = risultato.error.issues[0];
      throw erroreValidazione(
        issue?.message ?? 'Richiesta non valida.',
        issue && issue.path.length > 0 ? issue.path.join('.') : undefined,
      );
    }

    const conto = await repo.crea({
      nome: risultato.data.nome,
      saldoInizialeCents: risultato.data.saldoInizialeCents,
      dataApertura: risultato.data.dataApertura as DataISO,
      archiviato: false,
    });
    reply.code(201);
    return { ok: true, conto };
  });

  app.patch('/api/conti/:id', async (request) => {
    const { id } = request.params as { id: string };
    const risultato = aggiornaContoSchema.safeParse(request.body);
    if (!risultato.success) {
      const issue = risultato.error.issues[0];
      throw erroreValidazione(
        issue?.message ?? 'Richiesta non valida.',
        issue && issue.path.length > 0 ? issue.path.join('.') : undefined,
      );
    }

    const conto = await repo.aggiorna(
      id,
      risultato.data as Partial<Omit<ContoConDettagli, 'id'>>,
    );
    return { ok: true, conto };
  });

  app.delete('/api/conti/:id', async (request) => {
    const { id } = request.params as { id: string };
    await repo.archivia(id);
    const conto = await repo.ottieni(id);
    return { ok: true, conto };
  });
}
