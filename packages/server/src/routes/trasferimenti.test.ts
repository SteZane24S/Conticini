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

  function payload(dati: Record<string, unknown> = {}) {
    return {
      data: '2026-02-10',
      amountCents: 1200,
      contoOrigineId: 'conto-1',
      contoDestinazioneId: 'conto-2',
      descrizione: 'Giroconto',
      ...dati,
    };
  }

  it('crea un trasferimento valido', async () => {
    const response = await creaApp().inject({
      method: 'POST',
      url: '/api/trasferimenti',
      payload: payload(),
    });
    expect(response.statusCode).toBe(201);
    expect(response.json().trasferimento.movimenti).toHaveLength(2);
    expect(
      response
        .json()
        .trasferimento.movimenti.map(
          (movimento: { amountCents: number }) => movimento.amountCents,
        ),
    ).toEqual([-1200, 1200]);
  });

  it('restituisce gli errori di conto, schema e apertura', async () => {
    const applicazione = creaApp();
    const inesistente = await applicazione.inject({
      method: 'POST',
      url: '/api/trasferimenti',
      payload: payload({ contoOrigineId: 'inesistente' }),
    });
    const stesso = await applicazione.inject({
      method: 'POST',
      url: '/api/trasferimenti',
      payload: payload({ contoDestinazioneId: 'conto-1' }),
    });
    const apertura = await applicazione.inject({
      method: 'POST',
      url: '/api/trasferimenti',
      payload: payload({ data: '2026-01-15' }),
    });

    expect(inesistente.statusCode).toBe(404);
    expect(stesso.statusCode).toBe(400);
    expect(stesso.json().errore.codice).toBe('richiesta_non_valida');
    expect(apertura.statusCode).toBe(422);
    expect(apertura.json().errore.codice).toBe('movimento_anteriore_apertura');
  });

  it('ottiene, aggiorna e elimina un trasferimento', async () => {
    const applicazione = creaApp();
    const creato = await applicazione.inject({
      method: 'POST',
      url: '/api/trasferimenti',
      payload: payload(),
    });
    const gruppo = creato.json().trasferimento.transferGroupId as string;
    const letto = await applicazione.inject({
      method: 'GET',
      url: `/api/trasferimenti/${gruppo}`,
    });
    const descrizione = await applicazione.inject({
      method: 'PUT',
      url: `/api/trasferimenti/${gruppo}`,
      payload: { descrizione: 'Aggiornato' },
    });
    const importo = await applicazione.inject({
      method: 'PUT',
      url: `/api/trasferimenti/${gruppo}`,
      payload: { amountCents: 2500 },
    });
    const rilettura = await applicazione.inject({
      method: 'GET',
      url: `/api/trasferimenti/${gruppo}`,
    });
    const eliminato = await applicazione.inject({
      method: 'DELETE',
      url: `/api/trasferimenti/${gruppo}`,
    });
    const dopoEliminazione = await applicazione.inject({
      method: 'GET',
      url: `/api/trasferimenti/${gruppo}`,
    });

    expect(letto.statusCode).toBe(200);
    expect(descrizione.json().trasferimento.descrizione).toBe('Aggiornato');
    expect(importo.statusCode).toBe(200);
    expect(
      rilettura
        .json()
        .trasferimento.movimenti.map(
          (movimento: { amountCents: number }) => movimento.amountCents,
        ),
    ).toEqual([-2500, 2500]);
    expect(eliminato.json()).toEqual({ ok: true });
    expect(dopoEliminazione.statusCode).toBe(404);
  });

  it('restituisce non trovato per GET e PUT su gruppi inesistenti', async () => {
    const applicazione = creaApp();
    const get = await applicazione.inject({
      method: 'GET',
      url: '/api/trasferimenti/inesistente',
    });
    const put = await applicazione.inject({
      method: 'PUT',
      url: '/api/trasferimenti/inesistente',
      payload: { descrizione: 'x' },
    });

    expect(get.statusCode).toBe(404);
    expect(put.statusCode).toBe(404);
  });
});
