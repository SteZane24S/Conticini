import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import Database from 'better-sqlite3';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';

import { registraGestoreErrori } from '../errori.js';
import { runMigrations } from '../migrations-runner.js';
import { registraRotteCategorie } from './categorie.js';
import { registraRotteSettori } from './settori.js';

describe('rotte settori', () => {
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
    dir = mkdtempSync(path.join(tmpdir(), 'conticini-rotte-settori-'));
    db = new Database(path.join(dir, 'conticini.db'));
    runMigrations(db);
    app = Fastify();
    registraGestoreErrori(app);
    registraRotteSettori(app, { db, deviceId: 'device-test' });
    registraRotteCategorie(app, { db, deviceId: 'device-test' });
    return app;
  }

  async function creaSettore(applicazione: FastifyInstance) {
    return applicazione.inject({
      method: 'POST',
      url: '/api/settori',
      payload: { nome: 'Casa' },
    });
  }

  it('crea un settore valido', async () => {
    const applicazione = creaApp();

    const response = await creaSettore(applicazione);

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      ok: true,
      settore: { id: expect.any(String), nome: 'Casa' },
    });
  });

  it('rifiuta la creazione con nome mancante o vuoto', async () => {
    const applicazione = creaApp();

    const [mancante, vuoto] = await Promise.all([
      applicazione.inject({
        method: 'POST',
        url: '/api/settori',
        payload: {},
      }),
      applicazione.inject({
        method: 'POST',
        url: '/api/settori',
        payload: { nome: '' },
      }),
    ]);

    expect(mancante.statusCode).toBe(400);
    expect(mancante.json().errore.codice).toBe('richiesta_non_valida');
    expect(vuoto.statusCode).toBe(400);
    expect(vuoto.json().errore.codice).toBe('richiesta_non_valida');
  });

  it('rifiuta un nome gia esistente', async () => {
    const applicazione = creaApp();
    await creaSettore(applicazione);

    const response = await creaSettore(applicazione);

    expect(response.statusCode).toBe(409);
    expect(response.json().errore.codice).toBe('nome_duplicato');
  });

  it('elenca i settori creati', async () => {
    const applicazione = creaApp();
    const creato = await creaSettore(applicazione);

    const response = await applicazione.inject({
      method: 'GET',
      url: '/api/settori',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().settori).toContainEqual(creato.json().settore);
  });

  it('restituisce non trovato per un settore inesistente', async () => {
    const applicazione = creaApp();

    const response = await applicazione.inject({
      method: 'GET',
      url: '/api/settori/id-inesistente',
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().errore.codice).toBe('non_trovato');
  });

  it('aggiorna il nome di un settore', async () => {
    const applicazione = creaApp();
    const creato = await creaSettore(applicazione);

    const response = await applicazione.inject({
      method: 'PATCH',
      url: `/api/settori/${creato.json().settore.id}`,
      payload: { nome: 'Abitazione' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().settore.nome).toBe('Abitazione');
  });

  it('rifiuta l aggiornamento con un nome gia esistente', async () => {
    const applicazione = creaApp();
    await creaSettore(applicazione);
    const secondo = await applicazione.inject({
      method: 'POST',
      url: '/api/settori',
      payload: { nome: 'Svago' },
    });

    const response = await applicazione.inject({
      method: 'PATCH',
      url: `/api/settori/${secondo.json().settore.id}`,
      payload: { nome: 'Casa' },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().errore.codice).toBe('nome_duplicato');
  });

  it('rifiuta l aggiornamento senza campi', async () => {
    const applicazione = creaApp();
    const creato = await creaSettore(applicazione);

    const response = await applicazione.inject({
      method: 'PATCH',
      url: `/api/settori/${creato.json().settore.id}`,
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().errore.codice).toBe('richiesta_non_valida');
  });

  it('elimina un settore con DELETE', async () => {
    const applicazione = creaApp();
    const creato = await creaSettore(applicazione);
    const id = creato.json().settore.id;

    const response = await applicazione.inject({
      method: 'DELETE',
      url: `/api/settori/${id}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });

    const ottenuto = await applicazione.inject({
      method: 'GET',
      url: `/api/settori/${id}`,
    });
    expect(ottenuto.statusCode).toBe(404);
  });

  it("rifiuta l'eliminazione di un settore con categorie attive", async () => {
    const applicazione = creaApp();
    const creato = await creaSettore(applicazione);
    const id = creato.json().settore.id;

    await applicazione.inject({
      method: 'POST',
      url: '/api/categorie',
      payload: { nome: 'Affitto', kind: 'uscita', settoreId: id },
    });

    const response = await applicazione.inject({
      method: 'DELETE',
      url: `/api/settori/${id}`,
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().errore.codice).toBe('settore_con_categorie');

    const ottenuto = await applicazione.inject({
      method: 'GET',
      url: `/api/settori/${id}`,
    });
    expect(ottenuto.statusCode).toBe(200);
  });

  it('permette di riusare un nome dopo DELETE', async () => {
    const applicazione = creaApp();
    const creato = await creaSettore(applicazione);

    await applicazione.inject({
      method: 'DELETE',
      url: `/api/settori/${creato.json().settore.id}`,
    });
    const response = await creaSettore(applicazione);

    expect(response.statusCode).toBe(201);
    expect(response.json().settore.nome).toBe('Casa');
  });
});
