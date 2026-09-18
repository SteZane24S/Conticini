import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import Database from 'better-sqlite3';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';

import { registraGestoreErrori } from '../errori.js';
import { runMigrations } from '../migrations-runner.js';
import { registraRotteConti } from './conti.js';

describe('rotte conti', () => {
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
    dir = mkdtempSync(path.join(tmpdir(), 'conticini-rotte-conti-'));
    db = new Database(path.join(dir, 'conticini.db'));
    runMigrations(db);
    app = Fastify();
    registraGestoreErrori(app);
    registraRotteConti(app, { db, deviceId: 'device-test' });
    return app;
  }

  async function creaConto(applicazione: FastifyInstance) {
    return applicazione.inject({
      method: 'POST',
      url: '/api/conti',
      payload: {
        nome: 'Conto corrente',
        saldoInizialeCents: 12345,
        dataApertura: '2026-01-15',
      },
    });
  }

  it('crea un conto valido', async () => {
    const applicazione = creaApp();

    const response = await creaConto(applicazione);

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      ok: true,
      conto: {
        id: expect.any(String),
        nome: 'Conto corrente',
        saldoInizialeCents: 12345,
        dataApertura: '2026-01-15',
        archiviato: false,
      },
    });
  });

  it('rifiuta la creazione senza nome', async () => {
    const applicazione = creaApp();

    const response = await applicazione.inject({
      method: 'POST',
      url: '/api/conti',
      payload: { saldoInizialeCents: 0, dataApertura: '2026-01-01' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().errore.codice).toBe('richiesta_non_valida');
  });

  it('ignora archiviato nella creazione di un conto', async () => {
    const applicazione = creaApp();

    const response = await applicazione.inject({
      method: 'POST',
      url: '/api/conti',
      payload: {
        nome: 'Conto corrente',
        saldoInizialeCents: 0,
        dataApertura: '2026-01-01',
        archiviato: true,
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().conto.archiviato).toBe(false);
  });

  it('elenca i conti creati', async () => {
    const applicazione = creaApp();
    const creato = await creaConto(applicazione);

    const response = await applicazione.inject({
      method: 'GET',
      url: '/api/conti',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().conti).toContainEqual(creato.json().conto);
  });

  it('restituisce non trovato per un conto inesistente', async () => {
    const applicazione = creaApp();

    const response = await applicazione.inject({
      method: 'GET',
      url: '/api/conti/id-inesistente',
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().errore.codice).toBe('non_trovato');
  });

  it('aggiorna il nome di un conto', async () => {
    const applicazione = creaApp();
    const creato = await creaConto(applicazione);

    const response = await applicazione.inject({
      method: 'PATCH',
      url: `/api/conti/${creato.json().conto.id}`,
      payload: { nome: 'Conto rinominato' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().conto.nome).toBe('Conto rinominato');
  });

  it('restituisce non trovato aggiornando un conto inesistente', async () => {
    const applicazione = creaApp();

    const response = await applicazione.inject({
      method: 'PATCH',
      url: '/api/conti/id-inesistente',
      payload: { nome: 'Conto rinominato' },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().errore.codice).toBe('non_trovato');
  });

  it('rifiuta un aggiornamento senza campi', async () => {
    const applicazione = creaApp();
    const creato = await creaConto(applicazione);

    const response = await applicazione.inject({
      method: 'PATCH',
      url: `/api/conti/${creato.json().conto.id}`,
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().errore.codice).toBe('richiesta_non_valida');
    expect(response.json().errore).not.toHaveProperty('campo');
  });

  it('archivia un conto con DELETE', async () => {
    const applicazione = creaApp();
    const creato = await creaConto(applicazione);

    const response = await applicazione.inject({
      method: 'DELETE',
      url: `/api/conti/${creato.json().conto.id}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().conto.archiviato).toBe(true);
  });

  it('restituisce non trovato archiviando un conto inesistente', async () => {
    const applicazione = creaApp();

    const response = await applicazione.inject({
      method: 'DELETE',
      url: '/api/conti/id-inesistente',
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().errore.codice).toBe('non_trovato');
  });
});
