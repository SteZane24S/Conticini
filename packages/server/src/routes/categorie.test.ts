import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import Database from 'better-sqlite3';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';

import { registraGestoreErrori } from '../errori.js';
import { runMigrations } from '../migrations-runner.js';
import { creaRepositorioSettori } from '../repositories/settori.js';
import { registraRotteCategorie } from './categorie.js';

describe('rotte categorie', () => {
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
    dir = mkdtempSync(path.join(tmpdir(), 'conticini-rotte-categorie-'));
    db = new Database(path.join(dir, 'conticini.db'));
    runMigrations(db);
    app = Fastify();
    registraGestoreErrori(app);
    registraRotteCategorie(app, { db, deviceId: 'device-test' });
    return app;
  }

  async function creaSettore(nome = 'Casa') {
    return creaRepositorioSettori({ db: db!, deviceId: 'device-test' }).crea({
      nome,
    });
  }

  it('crea una categoria con settoreId esistente', async () => {
    const applicazione = creaApp();
    const settore = await creaSettore();

    const response = await applicazione.inject({
      method: 'POST',
      url: '/api/categorie',
      payload: { nome: 'Affitto', kind: 'uscita', settoreId: settore.id },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().categoria).toEqual({
      id: expect.any(String),
      nome: 'Affitto',
      kind: 'uscita',
      settoreId: settore.id,
    });
  });

  it('crea una categoria e un settore con settoreNome', async () => {
    const applicazione = creaApp();

    const response = await applicazione.inject({
      method: 'POST',
      url: '/api/categorie',
      payload: { nome: 'Stipendio', kind: 'entrata', settoreNome: 'Lavoro' },
    });

    expect(response.statusCode).toBe(201);
    const settore = db
      ?.prepare('SELECT name FROM sectors WHERE id = ?')
      .get(response.json().categoria.settoreId) as { name: string };
    expect(settore.name).toBe('Lavoro');
  });

  it('rifiuta un body senza o con entrambi i riferimenti al settore', async () => {
    const applicazione = creaApp();
    const settore = await creaSettore();

    const [senzaSettore, entrambi] = await Promise.all([
      applicazione.inject({
        method: 'POST',
        url: '/api/categorie',
        payload: { nome: 'Affitto', kind: 'uscita' },
      }),
      applicazione.inject({
        method: 'POST',
        url: '/api/categorie',
        payload: {
          nome: 'Affitto',
          kind: 'uscita',
          settoreId: settore.id,
          settoreNome: 'Casa',
        },
      }),
    ]);

    expect(senzaSettore.statusCode).toBe(400);
    expect(senzaSettore.json().errore.codice).toBe('richiesta_non_valida');
    expect(entrambi.statusCode).toBe(400);
    expect(entrambi.json().errore.codice).toBe('richiesta_non_valida');
  });

  it('rifiuta un settore inesistente', async () => {
    const applicazione = creaApp();

    const response = await applicazione.inject({
      method: 'POST',
      url: '/api/categorie',
      payload: { nome: 'Affitto', kind: 'uscita', settoreId: 'inesistente' },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().errore.codice).toBe('non_trovato');
  });

  it('rifiuta un nome duplicato nello stesso settore', async () => {
    const applicazione = creaApp();
    const settore = await creaSettore();
    const payload = { nome: 'Affitto', kind: 'uscita', settoreId: settore.id };
    await applicazione.inject({
      method: 'POST',
      url: '/api/categorie',
      payload,
    });

    const response = await applicazione.inject({
      method: 'POST',
      url: '/api/categorie',
      payload,
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().errore.codice).toBe('nome_duplicato');
  });

  it('elenca le categorie', async () => {
    const applicazione = creaApp();
    const settore = await creaSettore();
    const creata = await applicazione.inject({
      method: 'POST',
      url: '/api/categorie',
      payload: { nome: 'Affitto', kind: 'uscita', settoreId: settore.id },
    });

    const response = await applicazione.inject({
      method: 'GET',
      url: '/api/categorie',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().categorie).toContainEqual(creata.json().categoria);
  });

  it('restituisce non trovato per una categoria inesistente', async () => {
    const applicazione = creaApp();

    const response = await applicazione.inject({
      method: 'GET',
      url: '/api/categorie/id-inesistente',
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().errore.codice).toBe('non_trovato');
  });

  it('aggiorna il nome di una categoria', async () => {
    const applicazione = creaApp();
    const settore = await creaSettore();
    const creata = await applicazione.inject({
      method: 'POST',
      url: '/api/categorie',
      payload: { nome: 'Affitto', kind: 'uscita', settoreId: settore.id },
    });

    const response = await applicazione.inject({
      method: 'PATCH',
      url: `/api/categorie/${creata.json().categoria.id}`,
      payload: { nome: 'Canone' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().categoria.nome).toBe('Canone');
  });

  it('rifiuta un aggiornamento senza campi', async () => {
    const applicazione = creaApp();
    const settore = await creaSettore();
    const creata = await applicazione.inject({
      method: 'POST',
      url: '/api/categorie',
      payload: { nome: 'Affitto', kind: 'uscita', settoreId: settore.id },
    });

    const response = await applicazione.inject({
      method: 'PATCH',
      url: `/api/categorie/${creata.json().categoria.id}`,
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().errore.codice).toBe('richiesta_non_valida');
  });

  it('elimina una categoria', async () => {
    const applicazione = creaApp();
    const settore = await creaSettore();
    const creata = await applicazione.inject({
      method: 'POST',
      url: '/api/categorie',
      payload: { nome: 'Affitto', kind: 'uscita', settoreId: settore.id },
    });
    const id = creata.json().categoria.id;

    const eliminata = await applicazione.inject({
      method: 'DELETE',
      url: `/api/categorie/${id}`,
    });
    const ottenuta = await applicazione.inject({
      method: 'GET',
      url: `/api/categorie/${id}`,
    });

    expect(eliminata.statusCode).toBe(200);
    expect(ottenuta.statusCode).toBe(404);
  });
});
