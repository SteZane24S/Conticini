import { filtriExportMovimentiSchema } from '@conticini/contratti';
import type { FastifyInstance } from 'fastify';

import { erroreValidazione } from '../errori.js';
import { creaRepositorioConti } from '../repositories/conti.js';
import { elencaMovimentiFiltrati } from '../repositories/movimenti.js';
import type { ContestoScrittura } from '../scrittura.js';

function escapeCsv(valore: string): string {
  if (/[;"\r\n]/.test(valore)) {
    return `"${valore.replaceAll('"', '""')}"`;
  }
  return valore;
}

function formattaImportoCsv(amountCents: number): string {
  return (amountCents / 100).toFixed(2).replace('.', ',');
}

export function registraRotteExport(
  app: FastifyInstance,
  ctx: ContestoScrittura,
): void {
  app.get('/api/export/movimenti.csv', async (request, reply) => {
    const risultato = filtriExportMovimentiSchema.safeParse(request.query);
    if (!risultato.success) {
      const issue = risultato.error.issues[0];
      throw erroreValidazione(
        issue?.message ?? 'Richiesta non valida.',
        issue && issue.path.length > 0 ? issue.path.join('.') : undefined,
      );
    }

    const movimenti = elencaMovimentiFiltrati(ctx, risultato.data);
    const conti = await creaRepositorioConti(ctx).elenca();
    const tutteLeCategorie = ctx.db
      .prepare(
        'SELECT id, sector_id as settoreId, name as nome FROM categories',
      )
      .all() as Array<{ id: string; settoreId: string; nome: string }>;
    const tuttiISettori = ctx.db
      .prepare('SELECT id, name as nome FROM sectors')
      .all() as Array<{ id: string; nome: string }>;
    const contiPerId = new Map(conti.map((conto) => [conto.id, conto.nome]));
    const categoriePerId = new Map(
      tutteLeCategorie.map((categoria) => [categoria.id, categoria]),
    );
    const settoriPerId = new Map(
      tuttiISettori.map((settore) => [settore.id, settore.nome]),
    );

    const righe = movimenti.map((movimento) => {
      const categoria = movimento.categoriaId
        ? categoriePerId.get(movimento.categoriaId)
        : undefined;
      const valori = [
        movimento.data.split('-').reverse().join('/'),
        movimento.descrizione,
        formattaImportoCsv(movimento.amountCents),
        contiPerId.get(movimento.contoId) ?? movimento.contoId,
        categoria ? (settoriPerId.get(categoria.settoreId) ?? '') : '',
        categoria?.nome ?? '',
      ];
      return valori.map(escapeCsv).join(';');
    });
    const testoCsv = [
      'Data;Descrizione;Importo;Conto;Settore;Categoria',
      ...righe,
    ].join('\r\n');

    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header(
      'Content-Disposition',
      'attachment; filename="conticini-movimenti.csv"',
    );
    return `\uFEFF${testoCsv}`;
  });

  app.get('/api/export/completo.json', async (_request, reply) => {
    const meta = ctx.db
      .prepare(
        'SELECT dataset_id as datasetId, schema_version as schemaVersion FROM meta',
      )
      .get() as { datasetId: string; schemaVersion: number };
    const tabelle = [
      ['conti', 'accounts'],
      ['settori', 'sectors'],
      ['categorie', 'categories'],
      ['movimenti', 'transactions'],
      ['cicliStipendio', 'salary_cycles'],
      ['speseFisse', 'recurring_expenses'],
      ['occorrenze', 'recurring_occurrences'],
      ['previsioniDefault', 'budget_defaults'],
      ['previsioniOverride', 'budget_overrides'],
      ['regoleCategorie', 'category_rules'],
    ] as const;
    const entita: Record<string, unknown[]> = {};
    for (const [chiave, tabella] of tabelle) {
      entita[chiave] = ctx.db.prepare(`SELECT * FROM ${tabella}`).all();
    }

    reply.header('Content-Type', 'application/json; charset=utf-8');
    reply.header(
      'Content-Disposition',
      'attachment; filename="conticini-export.json"',
    );
    return {
      formatVersion: 1,
      schemaVersion: meta.schemaVersion,
      datasetId: meta.datasetId,
      esportatoIl: new Date().toISOString(),
      entita,
    };
  });
}
