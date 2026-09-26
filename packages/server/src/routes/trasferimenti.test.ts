import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import Database from 'better-sqlite3';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';

import { registraGestoreErrori } from '../errori.js';
import { runMigrations } from '../migrations-runner.js';
import { inserisci, type ContestoScrittura } from '../scrittura.js';
import { registraRotteTrasferimenti } from './trasferimenti.js';

describe('rotte trasferimenti', () => {
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

  function creaApp(): FastifyInstance {
    dir = mkdtempSync(path.join(tmpdir(), 'conticini-rotte-trasferimenti-'));
    db = new Database(path.join(dir, 'conticini.db'));
    runMigrations(db);
    const ctx: ContestoScrittura = { db, deviceId: 'device-test' };
    for (const [id, openedOn] of [
      ['conto-1', '2026-01-10'],
      ['conto-2', '2026-02-01'],
    ] as const) {
      inserisci(ctx, 'accounts', 'accounts', id, {
        name: id,
        initial_balance_cents: 0,
        opened_on: openedOn,
        archived: 0,
      });
    }
    app = Fastify();
    registraGestoreErrori(app);
    registraRotteTrasferimenti(app, ctx);
    return app;
  }

  function inserisciTrasferimentoStorico(
    gruppo: string,
    data = '2026-02-10',
  ): void {
    const inserisciRiga = db!.prepare(`
      INSERT INTO transactions (
        id, created_at, updated_at, deleted_at, revision, base_revision,
        date, amount_cents, account_id, category_id, description, description_norm,
        transfer_group_id, linked_position_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const timestamp = '2026-01-01T00:00:00.000Z';

    inserisciRiga.run(
      `${gruppo}-origine`,
      timestamp,
      timestamp,
      null,
      'r1',
      null,
      data,
      -1200,
      'conto-1',
      null,
      'Giroconto storico',
      'giroconto storico',
      gruppo,
      null,
    );
    inserisciRiga.run(
      `${gruppo}-destinazione`,
      timestamp,
      timestamp,
      null,
      'r1',
      null,
      data,
      1200,
      'conto-2',
      null,
      'Giroconto storico',
      'giroconto storico',
      gruppo,
      null,
    );
  }

  it('elenca i trasferimenti esistenti, dal piu recente', async () => {
    const applicazione = creaApp();
    inserisciTrasferimentoStorico('precedente', '2026-02-10');
    inserisciTrasferimentoStorico('recente', '2026-03-01');

    const response = await applicazione.inject({
      method: 'GET',
      url: '/api/trasferimenti',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().trasferimenti).toHaveLength(2);
    expect(response.json().trasferimenti[0].data).toBe('2026-03-01');
  });

  it('ottiene un trasferimento storico', async () => {
    const applicazione = creaApp();
    inserisciTrasferimentoStorico('storico');

    const response = await applicazione.inject({
      method: 'GET',
      url: '/api/trasferimenti/storico',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().trasferimento.transferGroupId).toBe('storico');
  });

  it('restituisce non trovato per GET su gruppi inesistenti', async () => {
    const response = await creaApp().inject({
      method: 'GET',
      url: '/api/trasferimenti/inesistente',
    });

    expect(response.statusCode).toBe(404);
  });

  it('restituisce rotta non trovata per POST', async () => {
    const response = await creaApp().inject({
      method: 'POST',
      url: '/api/trasferimenti',
      payload: {
        data: '2026-02-10',
        amountCents: 1200,
        contoOrigineId: 'conto-1',
        contoDestinazioneId: 'conto-2',
        descrizione: 'Giroconto',
      },
    });

    expect(response.statusCode).toBe(404);
  });

  it('restituisce rotta non trovata per PUT', async () => {
    const applicazione = creaApp();
    inserisciTrasferimentoStorico('storico');

    const response = await applicazione.inject({
      method: 'PUT',
      url: '/api/trasferimenti/storico',
      payload: { descrizione: 'Aggiornato' },
    });

    expect(response.statusCode).toBe(404);
  });

  it('restituisce rotta non trovata per DELETE', async () => {
    const applicazione = creaApp();
    inserisciTrasferimentoStorico('storico');

    const response = await applicazione.inject({
      method: 'DELETE',
      url: '/api/trasferimenti/storico',
    });

    expect(response.statusCode).toBe(404);
  });
});
