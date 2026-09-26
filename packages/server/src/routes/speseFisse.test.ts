import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import Database from 'better-sqlite3';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';

import { registraGestoreErrori } from '../errori.js';
import { runMigrations } from '../migrations-runner.js';
import { inserisci } from '../scrittura.js';
import { registraRotteSpeseFisse } from './speseFisse.js';

describe('rotte spese fisse', () => {
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
    dir = mkdtempSync(path.join(tmpdir(), 'conticini-rotte-spese-fisse-'));
    db = new Database(path.join(dir, 'conticini.db'));
    runMigrations(db);
    inserisci(
      { db, deviceId: 'device-test' },
      'accounts',
      'accounts',
      'conto-1',
      {
        name: 'Conto principale',
        initial_balance_cents: 0,
        opened_on: '2026-01-01',
        archived: 0,
      },
    );
    inserisci(
      { db, deviceId: 'device-test' },
      'sectors',
      'sectors',
      'settore-1',
      {
        name: 'Casa',
      },
    );
    inserisci(
      { db, deviceId: 'device-test' },
      'categories',
      'categories',
      'categoria-uscita',
      { sector_id: 'settore-1', name: 'Affitto', kind: 'uscita' },
    );
    app = Fastify();
    registraGestoreErrori(app);
    registraRotteSpeseFisse(app, { db, deviceId: 'device-test' });
    return app;
  }

  const payload = {
    nome: 'Affitto',
    regola: { tipo: 'monthly', anchorDay: 5, startDate: '2026-01-05' },
    amountCents: 85000,
    contoId: 'conto-1',
    categoriaId: 'categoria-uscita',
    mode: 'auto',
  };

  it('crea, elenca, ottiene, aggiorna ed elimina una spesa fissa', async () => {
    const applicazione = creaApp();

    const creata = await applicazione.inject({
      method: 'POST',
      url: '/api/spese-fisse',
      payload,
    });
    expect(creata.statusCode).toBe(201);
    const id = creata.json().spesaFissa.id as string;
    const elenco = await applicazione.inject({
      method: 'GET',
      url: '/api/spese-fisse',
    });
    const ottenuta = await applicazione.inject({
      method: 'GET',
      url: `/api/spese-fisse/${id}`,
    });
    inserisci(
      { db: db!, deviceId: 'device-test' },
      'recurring_occurrences',
      'recurring_occurrences',
      'pending-1',
      {
        recurring_id: id,
        period: '2026-02',
        due_date: '2026-02-05',
        amount_cents: 85000,
        account_id: 'conto-1',
        category_id: 'categoria-uscita',
        mode: 'auto',
        status: 'pending',
        transaction_id: null,
      },
    );
    inserisci(
      { db: db!, deviceId: 'device-test' },
      'recurring_occurrences',
      'recurring_occurrences',
      'paid-1',
      {
        recurring_id: id,
        period: '2026-01',
        due_date: '2026-01-05',
        amount_cents: 85000,
        account_id: 'conto-1',
        category_id: 'categoria-uscita',
        mode: 'auto',
        status: 'paid',
        transaction_id: null,
      },
    );
    const aggiornata = await applicazione.inject({
      method: 'PATCH',
      url: `/api/spese-fisse/${id}`,
      payload: { amountCents: 90000 },
    });
    const eliminata = await applicazione.inject({
      method: 'DELETE',
      url: `/api/spese-fisse/${id}`,
    });

    expect(creata.json().spesaFissa).toMatchObject({
      ...payload,
      contoId: null,
      active: true,
    });
    expect(elenco.statusCode).toBe(200);
    expect(elenco.json().speseFisse).toContainEqual(creata.json().spesaFissa);
    expect(ottenuta.statusCode).toBe(200);
    expect(ottenuta.json().spesaFissa).toEqual(creata.json().spesaFissa);
    expect(aggiornata.statusCode).toBe(200);
    expect(aggiornata.json().spesaFissa.amountCents).toBe(90000);
    expect(
      db
        ?.prepare('SELECT amount_cents FROM recurring_occurrences WHERE id = ?')
        .get('pending-1'),
    ).toEqual({ amount_cents: 90000 });
    expect(
      db
        ?.prepare('SELECT amount_cents FROM recurring_occurrences WHERE id = ?')
        .get('paid-1'),
    ).toEqual({ amount_cents: 85000 });
    expect(eliminata.statusCode).toBe(200);
  });

  it('rifiuta un aggiornamento senza campi', async () => {
    const applicazione = creaApp();
    const creata = await applicazione.inject({
      method: 'POST',
      url: '/api/spese-fisse',
      payload,
    });
    expect(creata.statusCode).toBe(201);

    const response = await applicazione.inject({
      method: 'PATCH',
      url: `/api/spese-fisse/${creata.json().spesaFissa.id as string}`,
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().errore.codice).toBe('richiesta_non_valida');
  });
});
