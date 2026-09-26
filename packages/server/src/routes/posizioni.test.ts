import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import Database from 'better-sqlite3';
import type { FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';

import { buildApp } from '../app.js';
import { runMigrations } from '../migrations-runner.js';

describe('rotte posizioni', () => {
  let dir: string | undefined;
  let db: Database.Database | undefined;
  let app: FastifyInstance | undefined;
  const headers = { host: '127.0.0.1:47300' };

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
    dir = mkdtempSync(path.join(tmpdir(), 'conticini-rotte-posizioni-'));
    db = new Database(path.join(dir, 'conticini.db'));
    runMigrations(db);
    app = buildApp({
      port: 47300,
      datasetId: 'dataset-test',
      versione: '0.0.0',
      db,
      deviceId: 'device-test',
    }).app;
    return app;
  }

  it('crea debiti e crediti con il segno salvato corretto', async () => {
    const applicazione = creaApp();

    const [debito, credito] = await Promise.all([
      applicazione.inject({
        method: 'POST',
        url: '/api/posizioni',
        headers,
        payload: {
          descrizione: 'Debito',
          verso: 'debito',
          importoCents: 20000,
        },
      }),
      applicazione.inject({
        method: 'POST',
        url: '/api/posizioni',
        headers,
        payload: {
          descrizione: 'Credito',
          verso: 'credito',
          importoCents: 20000,
        },
      }),
    ]);

    expect(debito.statusCode).toBe(201);
    expect(debito.json().posizione.importoInizialeCents).toBe(-20000);
    expect(credito.statusCode).toBe(201);
    expect(credito.json().posizione.importoInizialeCents).toBe(20000);
  });

  it('salda una posizione e rifiuta un importo eccessivo', async () => {
    const applicazione = creaApp();
    const creata = await applicazione.inject({
      method: 'POST',
      url: '/api/posizioni',
      headers,
      payload: {
        descrizione: 'Debito',
        verso: 'debito',
        importoCents: 20000,
      },
    });
    const id = creata.json().posizione.id as string;

    const riuscito = await applicazione.inject({
      method: 'POST',
      url: `/api/posizioni/${id}/salda`,
      headers,
      payload: {
        contoId: 'conto-inesistente',
        importoCents: 5000,
        data: '2026-09-21',
        operazioneId: 'route-ok',
      },
    });
    const eccessivo = await applicazione.inject({
      method: 'POST',
      url: `/api/posizioni/${id}/salda`,
      headers,
      payload: {
        contoId: 'conto-inesistente',
        importoCents: 15001,
        data: '2026-09-21',
        operazioneId: 'route-ko',
      },
    });

    expect(riuscito.statusCode).toBe(201);
    expect(riuscito.json().movimento.contoId).toBeNull();
    expect(riuscito.json().posizione.residuoCents).toBe(-15000);
    expect(eccessivo.statusCode).toBe(422);
    expect(eccessivo.json().errore.codice).toBe('importo_supera_residuo');
  });
});
