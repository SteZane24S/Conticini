import {
  richiestaPrevistoSpesoSchema,
  richiestaSaldoGiornalieroSchema,
  richiestaSpesePerSettoreSchema,
} from '@conticini/contratti';
import {
  aggiungiGiorni,
  intervalloCiclo,
  previstoSpesoPerCiclo,
  saldoGiornaliero,
  speseSettoreCategoria,
  type DataISO,
} from '@conticini/dominio';
import type { FastifyInstance } from 'fastify';

import { erroreNonTrovato, erroreValidazione } from '../errori.js';
import { creaRepositorioCategorie } from '../repositories/categorie.js';
import { creaRepositorioCicli } from '../repositories/cicli.js';
import { creaRepositorioConti } from '../repositories/conti.js';
import { creaRepositorioMovimenti } from '../repositories/movimenti.js';
import {
  creaRepositorioBudgetDefault,
  creaRepositorioBudgetOverride,
} from '../repositories/previsioni.js';
import type { ContestoScrittura } from '../scrittura.js';

export function registraRotteGrafici(
  app: FastifyInstance,
  ctx: ContestoScrittura,
): void {
  app.get('/api/grafici/spese-per-settore', async (request) => {
    const risultato = richiestaSpesePerSettoreSchema.safeParse(request.query);
    if (!risultato.success) {
      const issue = risultato.error.issues[0];
      throw erroreValidazione(
        issue?.message ?? 'Richiesta non valida.',
        issue && issue.path.length > 0 ? issue.path.join('.') : undefined,
      );
    }

    const movimenti = await creaRepositorioMovimenti(ctx).elenca();
    const categorie = await creaRepositorioCategorie(ctx).elenca();
    let intervallo;

    if (risultato.data.cicloId !== undefined) {
      const cicli = await creaRepositorioCicli(ctx).elenca();
      if (!cicli.some((ciclo) => ciclo.id === risultato.data.cicloId)) {
        throw erroreNonTrovato('ciclo', risultato.data.cicloId);
      }
      intervallo = intervalloCiclo(risultato.data.cicloId, cicli);
    } else {
      intervallo = {
        dataInizio: risultato.data.dataInizio as DataISO,
        dataFineEsclusiva: aggiungiGiorni(
          risultato.data.dataFine as DataISO,
          1,
        ),
      };
    }

    return {
      ok: true,
      settori: speseSettoreCategoria(movimenti, categorie, intervallo),
    };
  });

  app.get('/api/grafici/saldo-giornaliero', async (request) => {
    const risultato = richiestaSaldoGiornalieroSchema.safeParse(request.query);
    if (!risultato.success) {
      const issue = risultato.error.issues[0];
      throw erroreValidazione(
        issue?.message ?? 'Richiesta non valida.',
        issue && issue.path.length > 0 ? issue.path.join('.') : undefined,
      );
    }

    const conti = await creaRepositorioConti(ctx).elenca();
    const movimenti = await creaRepositorioMovimenti(ctx).elenca();

    return {
      ok: true,
      punti: saldoGiornaliero(
        risultato.data.dataInizio as DataISO,
        risultato.data.dataFine as DataISO,
        conti,
        movimenti,
      ),
    };
  });

  app.get('/api/grafici/previsto-speso', async (request) => {
    const risultato = richiestaPrevistoSpesoSchema.safeParse(request.query);
    if (!risultato.success) {
      const issue = risultato.error.issues[0];
      throw erroreValidazione(
        issue?.message ?? 'Richiesta non valida.',
        issue && issue.path.length > 0 ? issue.path.join('.') : undefined,
      );
    }

    const cicli = await creaRepositorioCicli(ctx).elenca();
    if (!cicli.some((ciclo) => ciclo.id === risultato.data.cicloId)) {
      throw erroreNonTrovato('ciclo', risultato.data.cicloId);
    }

    const budgetDefaults = await creaRepositorioBudgetDefault(ctx).elenca();
    const budgetOverrides = await creaRepositorioBudgetOverride(ctx).elenca(
      risultato.data.cicloId,
    );
    const movimenti = await creaRepositorioMovimenti(ctx).elenca();
    const categorie = await creaRepositorioCategorie(ctx).elenca();

    return {
      ok: true,
      ...previstoSpesoPerCiclo(
        risultato.data.cicloId,
        cicli,
        budgetDefaults,
        budgetOverrides,
        movimenti,
        categorie,
      ),
    };
  });
}
