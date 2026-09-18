import {
  impostaBudgetDefaultSchema,
  impostaBudgetOverrideSchema,
} from '@conticini/contratti';
import type { FastifyInstance } from 'fastify';

import { erroreValidazione } from '../errori.js';
import {
  budgetEffettivoPerCiclo,
  creaRepositorioBudgetDefault,
  creaRepositorioBudgetOverride,
} from '../repositories/previsioni.js';
import type { ContestoScrittura } from '../scrittura.js';

export function registraRottePrevisioni(
  app: FastifyInstance,
  ctx: ContestoScrittura,
): void {
  const repoDefault = creaRepositorioBudgetDefault(ctx);
  const repoOverride = creaRepositorioBudgetOverride(ctx);

  app.get('/api/previsioni/default', async () => ({
    ok: true,
    budgetDefaults: await repoDefault.elenca(),
  }));

  app.put('/api/previsioni/default/:categoriaId', async (request) => {
    const { categoriaId } = request.params as { categoriaId: string };
    const risultato = impostaBudgetDefaultSchema.safeParse(request.body);
    if (!risultato.success) {
      const issue = risultato.error.issues[0];
      throw erroreValidazione(
        issue?.message ?? 'Richiesta non valida.',
        issue && issue.path.length > 0 ? issue.path.join('.') : undefined,
      );
    }

    const budgetDefault = await repoDefault.imposta({
      categoriaId,
      amountCents: risultato.data.amountCents,
    });
    return { ok: true, budgetDefault };
  });

  app.put('/api/previsioni/override/:cicloId/:categoriaId', async (request) => {
    const { cicloId, categoriaId } = request.params as {
      cicloId: string;
      categoriaId: string;
    };
    const risultato = impostaBudgetOverrideSchema.safeParse(request.body);
    if (!risultato.success) {
      const issue = risultato.error.issues[0];
      throw erroreValidazione(
        issue?.message ?? 'Richiesta non valida.',
        issue && issue.path.length > 0 ? issue.path.join('.') : undefined,
      );
    }

    const budgetOverride = await repoOverride.imposta({
      cicloId,
      categoriaId,
      amountCents: risultato.data.amountCents,
    });
    return { ok: true, budgetOverride };
  });

  app.get('/api/previsioni/ciclo/:cicloId', async (request) => {
    const { cicloId } = request.params as { cicloId: string };
    return { ok: true, budget: budgetEffettivoPerCiclo(ctx, cicloId) };
  });
}
