import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import Database from 'better-sqlite3';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';

import { registraGestoreErrori } from '../errori.js';
import { runMigrations } from '../migrations-runner.js';
import { inserisci, type ContestoScrittura } from '../scrittura.js';
import { registraRotteMovimenti } from './movimenti.js';

describe('rotte movimenti', () => {
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
    dir = mkdtempSync(path.join(tmpdir(), 'conticini-rotte-movimenti-'));
    db = new Database(path.join(dir, 'conticini.db'));
    runMigrations(db);
    const ctx: ContestoScrittura = { db, deviceId: 'device-test' };
    inserisci(ctx, 'accounts', 'accounts', 'conto-1', {
      name: 'Conto principale',
      initial_balance_cents: 0,
      opened_on: '2026-01-10',
      archived: 0,
    });
    inserisci(ctx, 'accounts', 'accounts', 'conto-2', {
      name: 'Secondo conto',
      initial_balance_cents: 0,
      opened_on: '2026-01-10',
      archived: 0,
    });
    inserisci(ctx, 'sectors', 'sectors', 'settore-1', { name: 'Casa' });
    inserisci(ctx, 'categories', 'categories', 'categoria-uscita', {
      sector_id: 'settore-1',
      name: 'Spesa',
      kind: 'uscita',
    });
    inserisci(ctx, 'categories', 'categories', 'categoria-entrata', {
      sector_id: 'settore-1',
      name: 'Entrata',
      kind: 'entrata',
    });
    app = Fastify();
    registraGestoreErrori(app);
    registraRotteMovimenti(app, ctx);
    return app;
  }

  function payload(dati: Record<string, unknown> = {}) {
    return {
      data: '2026-02-10',
      amountCents: -1200,
      contoId: 'conto-1',
      categoriaId: 'categoria-uscita',
      descrizione: 'Spesa iniziale',
      ...dati,
    };
  }

  async function creaMovimento(
    applicazione: FastifyInstance,
    dati: Record<string, unknown> = {},
  ) {
    return applicazione.inject({
      method: 'POST',
      url: '/api/movimenti',
      payload: payload(dati),
    });
  }

  it('crea un movimento valido', async () => {
    const applicazione = creaApp();

    const response = await creaMovimento(applicazione);

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      ok: true,
      movimento: { id: expect.any(String), amountCents: -1200 },
    });
  });

  it('restituisce gli errori di conto, categoria e regole di dominio', async () => {
    const applicazione = creaApp();

    const conto = await creaMovimento(applicazione, { contoId: 'inesistente' });
    const categoria = await creaMovimento(applicazione, {
      categoriaId: 'inesistente',
    });
    const segno = await creaMovimento(applicazione, { amountCents: 1200 });
    const data = await creaMovimento(applicazione, { data: '2026-01-01' });

    expect(conto.statusCode).toBe(404);
    expect(categoria.statusCode).toBe(404);
    expect(segno.json().errore.codice).toBe('segno_non_coerente');
    expect(segno.statusCode).toBe(422);
    expect(data.json().errore.codice).toBe('movimento_anteriore_apertura');
    expect(data.statusCode).toBe(422);
  });

  it('rifiuta l importo zero nella validazione della richiesta', async () => {
    const applicazione = creaApp();

    const response = await creaMovimento(applicazione, { amountCents: 0 });

    expect(response.statusCode).toBe(400);
    expect(response.json().errore.messaggio).toBe(
      "L'importo non può essere zero.",
    );
  });

  it('elenca e filtra i movimenti con paginazione', async () => {
    const applicazione = creaApp();
    const primo = await creaMovimento(applicazione, {
      data: '2026-02-10',
      descrizione: 'Caffè Roma',
    });
    const secondo = await creaMovimento(applicazione, {
      data: '2026-02-11',
      descrizione: 'Bollette',
      contoId: 'conto-2',
      categoriaId: 'categoria-entrata',
      amountCents: 1200,
    });
    const terzo = await creaMovimento(applicazione, {
      data: '2026-02-12',
      descrizione: 'Caffè Milano',
    });

    const elenco = await applicazione.inject({
      method: 'GET',
      url: '/api/movimenti',
    });
    const conto = await applicazione.inject({
      method: 'GET',
      url: '/api/movimenti?contoId=conto-1',
    });
    const date = await applicazione.inject({
      method: 'GET',
      url: '/api/movimenti?dataDa=2026-02-11&dataA=2026-02-11',
    });
    const testo = await applicazione.inject({
      method: 'GET',
      url: '/api/movimenti?testo=CAFFÈ',
    });
    const pagina = await applicazione.inject({
      method: 'GET',
      url: '/api/movimenti?pagina=2&perPagina=1',
    });

    expect(elenco.json()).toMatchObject({
      totale: 3,
      movimenti: expect.any(Array),
    });
    expect(conto.json()).toMatchObject({
      totale: 2,
      movimenti: [
        { id: terzo.json().movimento.id },
        { id: primo.json().movimento.id },
      ],
    });
    expect(date.json()).toMatchObject({
      totale: 1,
      movimenti: expect.any(Array),
    });
    expect(testo.json()).toMatchObject({
      totale: 2,
      movimenti: expect.any(Array),
    });
    expect(pagina.json()).toMatchObject({
      totale: 3,
      movimenti: [{ id: secondo.json().movimento.id }],
    });
    expect(terzo.statusCode).toBe(201);
  });

  it('restituisce non trovato, aggiorna e cancella movimenti normali', async () => {
    const applicazione = creaApp();
    const creato = await creaMovimento(applicazione);
    const id = creato.json().movimento.id as string;

    const inesistente = await applicazione.inject({
      method: 'GET',
      url: '/api/movimenti/inesistente',
    });
    const aggiornato = await applicazione.inject({
      method: 'PATCH',
      url: `/api/movimenti/${id}`,
      payload: { descrizione: 'Aggiornata' },
    });
    const eliminato = await applicazione.inject({
      method: 'DELETE',
      url: `/api/movimenti/${id}`,
    });

    expect(inesistente.statusCode).toBe(404);
    expect(aggiornato.json().movimento.descrizione).toBe('Aggiornata');
    expect(eliminato.json()).toEqual({ ok: true });
  });

  it('protegge i movimenti che appartengono a trasferimenti', async () => {
    const applicazione = creaApp();
    const ctx: ContestoScrittura = { db: db!, deviceId: 'device-test' };
    inserisci(ctx, 'transactions', 'transactions', 'movimento-trasferimento', {
      date: '2026-02-10',
      amount_cents: -100,
      account_id: 'conto-1',
      category_id: null,
      description: 'Trasferimento',
      description_norm: 'trasferimento',
      transfer_group_id: 'gruppo-test',
    });

    const patch = await applicazione.inject({
      method: 'PATCH',
      url: '/api/movimenti/movimento-trasferimento',
      payload: { descrizione: 'Altro' },
    });
    const elimina = await applicazione.inject({
      method: 'DELETE',
      url: '/api/movimenti/movimento-trasferimento',
    });

    expect(patch.statusCode).toBe(422);
    expect(patch.json().errore.codice).toBe('movimento_di_trasferimento');
    expect(elimina.statusCode).toBe(422);
    expect(elimina.json().errore.codice).toBe('movimento_di_trasferimento');
  });
});
