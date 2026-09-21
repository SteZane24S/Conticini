import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import Database from 'better-sqlite3';
import type { FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';

import {
  ID_CATEGORIA_TECNICA_INCASSO_CREDITI,
  ID_CATEGORIA_TECNICA_PAGAMENTO_DEBITI,
  ID_SETTORE_TECNICO_DEBITI_CREDITI,
} from '@conticini/dominio';

import { buildApp } from './app.js';
import { ensureMeta } from './meta.js';
import { runMigrations } from './migrations-runner.js';

describe('buildApp', () => {
  it('risponde su /api/salute con Host 127.0.0.1:<porta>', async () => {
    const { app } = buildApp({
      port: 47300,
      datasetId: 'dataset-test',
      versione: '0.0.0',
    });
    const response = await app.inject({
      method: 'GET',
      url: '/api/salute',
      headers: { host: '127.0.0.1:47300' },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      ok: true,
      versione: '0.0.0',
      datasetId: 'dataset-test',
    });
  });

  it('accetta anche Host localhost:<porta>', async () => {
    const { app } = buildApp({
      port: 47300,
      datasetId: 'dataset-test',
      versione: '0.0.0',
    });
    const response = await app.inject({
      method: 'GET',
      url: '/api/salute',
      headers: { host: 'localhost:47300' },
    });
    expect(response.statusCode).toBe(200);
  });

  it('rifiuta con 421 un Host estraneo', async () => {
    const { app } = buildApp({
      port: 47300,
      datasetId: 'dataset-test',
      versione: '0.0.0',
    });
    const response = await app.inject({
      method: 'GET',
      url: '/api/salute',
      headers: { host: 'evil.example.com' },
    });
    expect(response.statusCode).toBe(421);
  });

  it('aggiorna il timestamp dell ultimo heartbeat', async () => {
    const { app, getLastHeartbeatMs } = buildApp({
      port: 47300,
      datasetId: 'dataset-test',
      versione: '0.0.0',
    });
    const before = getLastHeartbeatMs();
    await new Promise((resolve) => setTimeout(resolve, 5));
    const response = await app.inject({
      method: 'POST',
      url: '/api/heartbeat',
      headers: { host: '127.0.0.1:47300' },
    });
    expect(response.statusCode).toBe(200);
    expect(getLastHeartbeatMs()).toBeGreaterThan(before);
  });

  it('restituisce l envelope errore per una API inesistente senza file statici', async () => {
    const { app } = buildApp({
      port: 47300,
      datasetId: 'dataset-test',
      versione: '0.0.0',
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/non-esiste',
      headers: { host: '127.0.0.1:47300' },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      ok: false,
      errore: { codice: 'non_trovato', messaggio: 'non trovato' },
    });
  });
});

describe('buildApp — file statici della web app', () => {
  it('serve i file statici e fa fallback su index.html per le rotte client, ma non per /api', async () => {
    const webDistPath = mkdtempSync(path.join(tmpdir(), 'conticini-web-dist-'));
    writeFileSync(
      path.join(webDistPath, 'index.html'),
      '<!doctype html><title>Conticini</title>',
    );

    try {
      const { app } = buildApp({
        port: 47300,
        datasetId: 'dataset-test',
        versione: '0.0.0',
        webDistPath,
      });

      const [indexRes, fallbackRes, apiRes] = await Promise.all([
        app.inject({
          method: 'GET',
          url: '/',
          headers: { host: '127.0.0.1:47300' },
        }),
        app.inject({
          method: 'GET',
          url: '/movimenti',
          headers: { host: '127.0.0.1:47300' },
        }),
        app.inject({
          method: 'GET',
          url: '/api/non-esiste',
          headers: { host: '127.0.0.1:47300' },
        }),
      ]);

      expect(indexRes.statusCode).toBe(200);
      expect(indexRes.body).toContain('<title>Conticini</title>');

      expect(fallbackRes.statusCode).toBe(200);
      expect(fallbackRes.body).toContain('<title>Conticini</title>');

      expect(apiRes.statusCode).toBe(404);
      expect(apiRes.json()).toEqual({
        ok: false,
        errore: { codice: 'non_trovato', messaggio: 'non trovato' },
      });
    } finally {
      rmSync(webDistPath, { recursive: true, force: true });
    }
  });

  it('non registra il file serving se webDistPath non esiste, e le API restano attive', async () => {
    const { app } = buildApp({
      port: 47300,
      datasetId: 'dataset-test',
      versione: '0.0.0',
      webDistPath: path.join(tmpdir(), 'conticini-cartella-inesistente-xyz'),
    });

    const saluteResponse = await app.inject({
      method: 'GET',
      url: '/api/salute',
      headers: { host: '127.0.0.1:47300' },
    });
    expect(saluteResponse.statusCode).toBe(200);

    const homeResponse = await app.inject({
      method: 'GET',
      url: '/',
      headers: { host: '127.0.0.1:47300' },
    });
    expect(homeResponse.statusCode).toBe(404);
  });
});

describe('buildApp — rotte dati', () => {
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

  function apriDatabase(): Database.Database {
    dir = mkdtempSync(path.join(tmpdir(), 'conticini-app-'));
    const database = new Database(path.join(dir, 'conticini.db'));
    runMigrations(database);
    db = database;
    return database;
  }

  it('collega le rotte dati a un database reale', async () => {
    const database = apriDatabase();
    const headers = { host: '127.0.0.1:47300' };
    const applicazione = (app = buildApp({
      port: 47300,
      datasetId: 'dataset-test',
      versione: '0.0.0',
      db: database,
      deviceId: 'device-test',
    }).app);

    const [contiRes, settoriRes, categorieRes, movimentiRes] =
      await Promise.all([
        applicazione.inject({ method: 'GET', url: '/api/conti', headers }),
        applicazione.inject({ method: 'GET', url: '/api/settori', headers }),
        applicazione.inject({ method: 'GET', url: '/api/categorie', headers }),
        applicazione.inject({ method: 'GET', url: '/api/movimenti', headers }),
      ]);

    expect(contiRes.statusCode).toBe(200);
    expect(contiRes.json()).toEqual({ ok: true, conti: [] });
    expect(settoriRes.statusCode).toBe(200);
    expect(settoriRes.json()).toEqual({
      ok: true,
      settori: [
        {
          id: ID_SETTORE_TECNICO_DEBITI_CREDITI,
          nome: 'Debiti e crediti (tecnico)',
        },
      ],
    });
    expect(categorieRes.statusCode).toBe(200);
    expect(categorieRes.json()).toEqual({
      ok: true,
      categorie: [
        {
          id: ID_CATEGORIA_TECNICA_INCASSO_CREDITI,
          nome: 'Incasso crediti',
          kind: 'entrata',
          settoreId: ID_SETTORE_TECNICO_DEBITI_CREDITI,
        },
        {
          id: ID_CATEGORIA_TECNICA_PAGAMENTO_DEBITI,
          nome: 'Pagamento debiti',
          kind: 'uscita',
          settoreId: ID_SETTORE_TECNICO_DEBITI_CREDITI,
        },
      ],
    });
    expect(movimentiRes.statusCode).toBe(200);
    expect(movimentiRes.json()).toEqual({
      ok: true,
      movimenti: [],
      totale: 0,
      pagina: 1,
      perPagina: 50,
    });

    const contoRes = await applicazione.inject({
      method: 'POST',
      url: '/api/conti',
      headers,
      payload: {
        nome: 'Conto test',
        saldoInizialeCents: 0,
        dataApertura: '2026-01-01',
      },
    });
    expect(contoRes.statusCode).toBe(201);
    const conto = contoRes.json() as {
      conto: { id: string; dataApertura: string };
    };

    const settoreRes = await applicazione.inject({
      method: 'POST',
      url: '/api/settori',
      headers,
      payload: { nome: 'Entrate' },
    });
    expect(settoreRes.statusCode).toBe(201);
    const settore = settoreRes.json() as { settore: { id: string } };

    const categoriaRes = await applicazione.inject({
      method: 'POST',
      url: '/api/categorie',
      headers,
      payload: {
        nome: 'Stipendio',
        kind: 'entrata',
        settoreId: settore.settore.id,
      },
    });
    expect(categoriaRes.statusCode).toBe(201);
    const categoria = categoriaRes.json() as { categoria: { id: string } };

    const movimentoRes = await applicazione.inject({
      method: 'POST',
      url: '/api/movimenti',
      headers,
      payload: {
        data: conto.conto.dataApertura,
        amountCents: 100,
        contoId: conto.conto.id,
        categoriaId: categoria.categoria.id,
        descrizione: 'Entrata test',
      },
    });
    expect(movimentoRes.statusCode).toBe(201);

    const elencoRes = await applicazione.inject({
      method: 'GET',
      url: '/api/movimenti',
      headers,
    });
    expect(elencoRes.statusCode).toBe(200);
    expect(
      (elencoRes.json() as { movimenti: unknown[] }).movimenti,
    ).toHaveLength(1);
  });

  it('non registra le rotte dati senza database e deviceId', async () => {
    const applicazione = (app = buildApp({
      port: 47300,
      datasetId: 'dataset-test',
      versione: '0.0.0',
    }).app);

    const response = await applicazione.inject({
      method: 'GET',
      url: '/api/conti',
      headers: { host: '127.0.0.1:47300' },
    });

    expect(response.statusCode).toBe(404);
  });

  it('collega le rotte di backup quando dataDir è fornito', async () => {
    const database = apriDatabase();
    const headers = { host: '127.0.0.1:47300' };
    const applicazione = (app = buildApp({
      port: 47300,
      datasetId: 'dataset-test',
      versione: '0.0.0',
      db: database,
      deviceId: 'device-test',
      dataDir: dir,
    }).app);

    const response = await applicazione.inject({
      method: 'GET',
      url: '/api/backup',
      headers,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      impostazioni: expect.any(Object),
      backups: expect.any(Array),
      ultimo: null,
      ultimoVecchio: false,
    });
  });

  it('non registra le rotte di backup senza dataDir', async () => {
    const database = apriDatabase();
    const applicazione = (app = buildApp({
      port: 47300,
      datasetId: 'dataset-test',
      versione: '0.0.0',
      db: database,
      deviceId: 'device-test',
    }).app);

    const response = await applicazione.inject({
      method: 'GET',
      url: '/api/backup',
      headers: { host: '127.0.0.1:47300' },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      ok: false,
      errore: { codice: 'non_trovato', messaggio: 'non trovato' },
    });
  });

  it('collega le rotte di export con un database reale', async () => {
    const database = apriDatabase();
    ensureMeta(database);
    const applicazione = (app = buildApp({
      port: 47300,
      datasetId: 'dataset-test',
      versione: '0.0.0',
      db: database,
      deviceId: 'device-test',
    }).app);

    const response = await applicazione.inject({
      method: 'GET',
      url: '/api/export/completo.json',
      headers: { host: '127.0.0.1:47300' },
    });

    expect(response.statusCode).toBe(200);
  });
});
