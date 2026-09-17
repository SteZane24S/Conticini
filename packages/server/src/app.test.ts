import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { buildApp } from './app.js';

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
      expect(apiRes.json()).toEqual({ ok: false, errore: 'non trovato' });
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
