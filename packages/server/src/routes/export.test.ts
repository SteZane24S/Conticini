import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import Database from 'better-sqlite3';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';

import { registraGestoreErrori } from '../errori.js';
import { ensureMeta, type Meta } from '../meta.js';
import { runMigrations } from '../migrations-runner.js';
import { cancella, inserisci, type ContestoScrittura } from '../scrittura.js';
import { registraRotteExport } from './export.js';

describe('rotte export', () => {
  let dir: string | undefined;
  let db: Database.Database | undefined;
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
    db?.close();
    db = undefined;
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
      dir = undefined;
    }
  });

  function creaApp(): {
    applicazione: FastifyInstance;
    ctx: ContestoScrittura;
    meta: Meta;
  } {
    dir = mkdtempSync(path.join(tmpdir(), 'conticini-rotte-export-'));
    db = new Database(path.join(dir, 'conticini.db'));
    runMigrations(db);
    const meta = ensureMeta(db);
    const ctx: ContestoScrittura = { db, deviceId: 'device-test' };
    inserisci(ctx, 'accounts', 'accounts', 'conto-1', {
      name: 'Conto principale',
      initial_balance_cents: 100000,
      opened_on: '2024-01-01',
      archived: 0,
    });
    inserisci(ctx, 'accounts', 'accounts', 'conto-2', {
      name: 'Conto risparmio',
      initial_balance_cents: 0,
      opened_on: '2024-01-01',
      archived: 0,
    });
    inserisci(ctx, 'sectors', 'sectors', 'settore-1', { name: 'Casa' });
    inserisci(ctx, 'categories', 'categories', 'categoria-1', {
      sector_id: 'settore-1',
      name: 'Spesa casa',
      kind: 'uscita',
    });
    inserisci(ctx, 'categories', 'categories', 'categoria-2', {
      sector_id: 'settore-1',
      name: 'Entrata extra',
      kind: 'entrata',
    });
    inserisci(ctx, 'transactions', 'transactions', 'movimento-negativo', {
      date: '2024-01-10',
      amount_cents: -1234,
      account_id: 'conto-1',
      category_id: 'categoria-1',
      description: 'Spesa supermercato',
      description_norm: 'spesa supermercato',
      transfer_group_id: null,
    });
    inserisci(ctx, 'transactions', 'transactions', 'movimento-positivo', {
      date: '2024-01-11',
      amount_cents: 2500,
      account_id: 'conto-1',
      category_id: 'categoria-2',
      description: 'Entrata extra',
      description_norm: 'entrata extra',
      transfer_group_id: null,
    });
    inserisci(ctx, 'transactions', 'transactions', 'trasferimento-uscita', {
      date: '2024-01-15',
      amount_cents: -5000,
      account_id: 'conto-1',
      category_id: null,
      description: 'Trasferimento uscita',
      description_norm: 'trasferimento uscita',
      transfer_group_id: 'trasferimento-1',
    });
    inserisci(ctx, 'transactions', 'transactions', 'trasferimento-entrata', {
      date: '2024-01-15',
      amount_cents: 5000,
      account_id: 'conto-2',
      category_id: null,
      description: 'Trasferimento entrata',
      description_norm: 'trasferimento entrata',
      transfer_group_id: 'trasferimento-1',
    });
    app = Fastify();
    registraGestoreErrori(app);
    registraRotteExport(app, ctx);
    return { applicazione: app, ctx, meta };
  }

  it('esporta i movimenti in CSV per Excel italiano', async () => {
    const { applicazione } = creaApp();

    const response = await applicazione.inject({
      method: 'GET',
      url: '/api/export/movimenti.csv',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.payload.charCodeAt(0)).toBe(0xfeff);
    expect(response.payload.slice(1)).toContain(
      'Data;Descrizione;Importo;Conto;Settore;Categoria',
    );
    expect(response.payload).toContain('-12,34');
    expect(response.payload).not.toContain('-12.34');
    expect(response.payload).not.toContain('-12,34 €');
    expect(response.payload).toContain(
      '15/01/2024;Trasferimento uscita;-50,00;Conto principale;;',
    );
  });

  it('filtra i movimenti esportati in CSV', async () => {
    const { applicazione } = creaApp();

    const response = await applicazione.inject({
      method: 'GET',
      url: '/api/export/movimenti.csv?dataDa=2024-01-10&dataA=2024-01-10',
    });

    expect(response.statusCode).toBe(200);
    expect(response.payload.slice(1).split('\r\n')).toHaveLength(2);
    expect(response.payload).toContain('Spesa supermercato');
  });

  it('mantiene i nomi storici di una categoria cancellata nel CSV', async () => {
    const { applicazione, ctx } = creaApp();
    const revisione = (
      ctx.db
        .prepare('SELECT revision FROM categories WHERE id = ?')
        .get('categoria-1') as { revision: string }
    ).revision;
    cancella(ctx, 'categories', 'categories', 'categoria-1', revisione);

    const response = await applicazione.inject({
      method: 'GET',
      url: '/api/export/movimenti.csv',
    });

    expect(response.statusCode).toBe(200);
    expect(response.payload).toContain(
      '10/01/2024;Spesa supermercato;-12,34;Conto principale;Casa;Spesa casa',
    );
    expect(response.payload).toContain(
      '15/01/2024;Trasferimento uscita;-50,00;Conto principale;;',
    );
  });

  it('rifiuta filtri CSV non validi', async () => {
    const { applicazione } = creaApp();

    const response = await applicazione.inject({
      method: 'GET',
      url: '/api/export/movimenti.csv?dataDa=non-una-data',
    });

    expect(response.statusCode).toBe(400);
  });

  it('esporta tutte le entita JSON, inclusi i tombstone', async () => {
    const { applicazione, ctx, meta } = creaApp();
    const revisione = (
      ctx.db
        .prepare('SELECT revision FROM transactions WHERE id = ?')
        .get('movimento-negativo') as { revision: string }
    ).revision;
    cancella(
      ctx,
      'transactions',
      'transactions',
      'movimento-negativo',
      revisione,
    );

    const response = await applicazione.inject({
      method: 'GET',
      url: '/api/export/completo.json',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('application/json');
    const corpo = response.json() as {
      formatVersion: number;
      schemaVersion: number;
      datasetId: string;
      entita: {
        conti: Array<Record<string, unknown>>;
        movimenti: Array<Record<string, unknown>>;
      };
    };
    expect(corpo.formatVersion).toBe(1);
    expect(corpo.schemaVersion).toBe(meta.schemaVersion);
    expect(corpo.datasetId).toBe(meta.datasetId);
    expect(corpo.entita.conti).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'conto-1' })]),
    );
    expect(corpo.entita.movimenti).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'movimento-negativo',
          amount_cents: -1234,
          deleted_at: expect.any(String),
        }),
      ]),
    );
    expect(corpo.entita.movimenti[0]).toHaveProperty('amount_cents');
    expect(corpo.entita.movimenti[0]).not.toHaveProperty('amountCents');
  });
});
