import { richiestaProspettoSchema } from '@conticini/contratti';
import { oggiLocale, prospetto, type DataISO } from '@conticini/dominio';
import type { FastifyInstance } from 'fastify';

import { erroreValidazione } from '../errori.js';
import { creaRepositorioCicli } from '../repositories/cicli.js';
import { creaRepositorioConti } from '../repositories/conti.js';
import { creaRepositorioMovimenti } from '../repositories/movimenti.js';
import { creaRepositorioOccorrenze } from '../repositories/occorrenze.js';
import {
  creaRepositorioBudgetDefault,
  elencaTutteLeBudgetOverride,
} from '../repositories/previsioni.js';
import type { ContestoScrittura } from '../scrittura.js';

export function registraRotteProspetto(
  app: FastifyInstance,
  ctx: ContestoScrittura,
): void {
  app.get('/api/prospetto', async (request) => {
    const risultato = richiestaProspettoSchema.safeParse(request.query);
    if (!risultato.success) {
      const issue = risultato.error.issues[0];
      throw erroreValidazione(
        issue?.message ?? 'Richiesta non valida.',
        issue && issue.path.length > 0 ? issue.path.join('.') : undefined,
      );
    }

    const oggi = oggiLocale(new Date());
    const d = (risultato.data.data ?? oggi) as DataISO;

    const conti = await creaRepositorioConti(ctx).elenca();
    const movimenti = await creaRepositorioMovimenti(ctx).elenca();
    const cicli = await creaRepositorioCicli(ctx).elenca();
    const occorrenzeFisse = await creaRepositorioOccorrenze(ctx).elenca();
    const budgetDefaults = await creaRepositorioBudgetDefault(ctx).elenca();
    const budgetOverrides = elencaTutteLeBudgetOverride(ctx);

    return {
      ok: true,
      prospetto: prospetto(d, oggi, {
        conti,
        movimenti,
        cicli,
        occorrenzeFisse,
        budgetDefaults,
        budgetOverrides,
      }),
    };
  });
}
