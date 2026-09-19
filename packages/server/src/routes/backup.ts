import {
  aggiornaImpostazioniBackupSchema,
  ripristinaBackupSchema,
} from '@conticini/contratti';
import { oggiLocale } from '@conticini/dominio';
import type { FastifyInstance } from 'fastify';

import {
  ErroreBackupNonValido,
  elencaBackup,
  eseguiBackup,
  leggiImpostazioniBackup,
  ripristinaBackup,
  scriviImpostazioniBackup,
  statoUltimoBackup,
} from '../backup.js';
import { eseguiCatchUp } from '../catchUp.js';
import { erroreBackupNonValido, erroreValidazione } from '../errori.js';
import type { ContestoScrittura } from '../scrittura.js';

export function registraRotteBackup(
  app: FastifyInstance,
  ctx: ContestoScrittura,
  dataDir: string,
): void {
  app.get('/api/backup', async () => {
    const impostazioni = leggiImpostazioniBackup(dataDir);
    const backups = elencaBackup(impostazioni.cartella);
    const stato = statoUltimoBackup(impostazioni.cartella);

    return {
      ok: true,
      impostazioni,
      backups,
      ultimo: stato.ultimo,
      ultimoVecchio: stato.vecchioDiPiuDi7Giorni,
    };
  });

  app.post('/api/backup', async (_request, reply) => {
    const impostazioni = leggiImpostazioniBackup(dataDir);
    const backup = await eseguiBackup(
      () => ctx.db,
      impostazioni.cartella,
      impostazioni.rotazione,
    );
    reply.code(201);
    return { ok: true, backup };
  });

  app.patch('/api/backup/impostazioni', async (request) => {
    const risultato = aggiornaImpostazioniBackupSchema.safeParse(request.body);
    if (!risultato.success) {
      const issue = risultato.error.issues[0];
      throw erroreValidazione(
        issue?.message ?? 'Richiesta non valida.',
        issue && issue.path.length > 0 ? issue.path.join('.') : undefined,
      );
    }

    const nuove = {
      ...leggiImpostazioniBackup(dataDir),
      ...risultato.data,
    };
    scriviImpostazioniBackup(dataDir, nuove);
    return { ok: true, impostazioni: nuove };
  });

  app.post('/api/backup/ripristina', async (request) => {
    const risultato = ripristinaBackupSchema.safeParse(request.body);
    if (!risultato.success) {
      const issue = risultato.error.issues[0];
      throw erroreValidazione(
        issue?.message ?? 'Richiesta non valida.',
        issue && issue.path.length > 0 ? issue.path.join('.') : undefined,
      );
    }

    try {
      await ripristinaBackup(ctx, dataDir, risultato.data.nomeFile);
      eseguiCatchUp(ctx, oggiLocale(new Date()));
      return { ok: true };
    } catch (errore) {
      if (errore instanceof ErroreBackupNonValido) {
        throw erroreBackupNonValido(errore.message);
      }
      throw errore;
    }
  });
}
