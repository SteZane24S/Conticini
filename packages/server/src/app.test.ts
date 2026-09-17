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
