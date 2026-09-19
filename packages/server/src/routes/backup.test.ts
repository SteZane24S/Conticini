import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import Database from 'better-sqlite3';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';

import { registraGestoreErrori } from '../errori.js';
import { ensureMeta } from '../meta.js';
import { runMigrations } from '../migrations-runner.js';
import { inserisci, type ContestoScrittura } from '../scrittura.js';
import { registraRotteBackup } from './backup.js';

describe('rotte backup', () => {
  let dir: string | undefined;
  let app: FastifyInstance | undefined;
  let ctx: ContestoScrittura | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
    ctx?.db.close();
    ctx = undefined;
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
      dir = undefined;
    }
  });

  function creaApp(): {
    applicazione: FastifyInstance;
    ctx: ContestoScrittura;
  } {
    dir = mkdtempSync(path.join(tmpdir(), 'conticini-rotte-backup-'));
    const db = new Database(path.join(dir, 'conticini.db'));
    runMigrations(db);
    ensureMeta(db);
    ctx = { db, deviceId: 'device-test' };
    app = Fastify();
    registraGestoreErrori(app);
    registraRotteBackup(app, ctx, dir);
    return { applicazione: app, ctx };
  }

  function inserisciContoEMovimentoA(contesto: ContestoScrittura): void {
    inserisci(contesto, 'accounts', 'accounts', 'conto-1', {
      name: 'Conto principale',
      initial_balance_cents: 100000,
      opened_on: '2024-01-01',
      archived: 0,
    });
    inserisci(contesto, 'transactions', 'transactions', 'movimento-a', {
      date: '2024-01-02',
      amount_cents: 1000,
      account_id: 'conto-1',
      category_id: null,
      description: 'A',
      description_norm: 'a',
      transfer_group_id: null,
    });
  }

  it('restituisce lo stato iniziale del backup', async () => {
    const { applicazione } = creaApp();

    const risposta = await applicazione.inject({
      method: 'GET',
      url: '/api/backup',
    });

    expect(risposta.statusCode).toBe(200);
    expect(risposta.json()).toEqual({
      ok: true,
      impostazioni: { cartella: path.join(dir!, 'backup'), rotazione: 7 },
      backups: [],
      ultimo: null,
      ultimoVecchio: false,
    });
  });

  it('crea e mostra un backup', async () => {
    const { applicazione } = creaApp();

    const creazione = await applicazione.inject({
      method: 'POST',
      url: '/api/backup',
    });

    expect(creazione.statusCode).toBe(201);
    const backup = creazione.json().backup as { nomeFile: string };
    expect(backup.nomeFile).toMatch(/^conticini-\d{8}-\d{6}(?:-\d+)?\.db$/);

    const stato = await applicazione.inject({
      method: 'GET',
      url: '/api/backup',
    });
    expect(stato.json().backups).toHaveLength(1);
    expect(stato.json().ultimo.nomeFile).toBe(backup.nomeFile);
  });

  it('aggiorna le impostazioni del backup', async () => {
    const { applicazione } = creaApp();

    const aggiornamento = await applicazione.inject({
      method: 'PATCH',
      url: '/api/backup/impostazioni',
      payload: { rotazione: 2 },
    });

    expect(aggiornamento.statusCode).toBe(200);
    expect(aggiornamento.json().impostazioni.rotazione).toBe(2);
    const stato = await applicazione.inject({
      method: 'GET',
      url: '/api/backup',
    });
    expect(stato.json().impostazioni.rotazione).toBe(2);
  });

  it('applica la rotazione durante la creazione', async () => {
    const { applicazione } = creaApp();
    await applicazione.inject({
      method: 'PATCH',
      url: '/api/backup/impostazioni',
      payload: { rotazione: 2 },
    });

    await applicazione.inject({ method: 'POST', url: '/api/backup' });
    await applicazione.inject({ method: 'POST', url: '/api/backup' });
    await applicazione.inject({ method: 'POST', url: '/api/backup' });

    const stato = await applicazione.inject({
      method: 'GET',
      url: '/api/backup',
    });
    expect(stato.json().backups).toHaveLength(2);
  });

  it('ripristina i dati presenti nel punto di ripristino', async () => {
    const { applicazione, ctx: contesto } = creaApp();
    inserisciContoEMovimentoA(contesto);

    const backup = await applicazione.inject({
      method: 'POST',
      url: '/api/backup',
    });
    const puntoDiRipristino = backup.json().backup.nomeFile as string;
    const backupDb = new Database(path.join(dir!, 'backup', puntoDiRipristino));
    backupDb.prepare('UPDATE meta SET schema_version = 0').run();
    backupDb.close();

    inserisci(contesto, 'transactions', 'transactions', 'movimento-b', {
      date: '2024-01-03',
      amount_cents: 2000,
      account_id: 'conto-1',
      category_id: null,
      description: 'B',
      description_norm: 'b',
      transfer_group_id: null,
    });

    const ripristino = await applicazione.inject({
      method: 'POST',
      url: '/api/backup/ripristina',
      payload: { nomeFile: puntoDiRipristino },
    });

    expect(ripristino.statusCode).toBe(200);
    expect(ripristino.json()).toEqual({ ok: true });
    const movimenti = contesto.db
      .prepare('SELECT id FROM transactions WHERE deleted_at IS NULL')
      .all() as Array<{ id: string }>;
    expect(movimenti.map((movimento) => movimento.id)).toContain('movimento-a');
    expect(movimenti.map((movimento) => movimento.id)).not.toContain(
      'movimento-b',
    );
    const meta = contesto.db
      .prepare('SELECT schema_version FROM meta')
      .get() as { schema_version: number };
    const migrazioni = contesto.db
      .prepare('SELECT COUNT(*) as count FROM schema_migrations')
      .get() as { count: number };
    expect(meta.schema_version).toBe(migrazioni.count);
  });

  it('ripristina con rotazione a uno e mantiene il limite di backup', async () => {
    const { applicazione, ctx: contesto } = creaApp();
    inserisciContoEMovimentoA(contesto);
    await applicazione.inject({
      method: 'PATCH',
      url: '/api/backup/impostazioni',
      payload: { rotazione: 1 },
    });

    const backup = await applicazione.inject({
      method: 'POST',
      url: '/api/backup',
    });
    const puntoDiRipristino = backup.json().backup.nomeFile as string;

    const ripristino = await applicazione.inject({
      method: 'POST',
      url: '/api/backup/ripristina',
      payload: { nomeFile: puntoDiRipristino },
    });

    expect(ripristino.statusCode).toBe(200);
    expect(ripristino.json()).toEqual({ ok: true });
    const stato = await applicazione.inject({
      method: 'GET',
      url: '/api/backup',
    });
    expect(stato.json().backups).toHaveLength(1);
  });

  it('rifiuta nomi di backup non validi senza sostituire il database', async () => {
    const { applicazione, ctx: contesto } = creaApp();
    inserisciContoEMovimentoA(contesto);
    const prima = contesto.db
      .prepare('SELECT COUNT(*) as count FROM transactions')
      .get() as { count: number };

    for (const nomeFile of ['../../../etc/passwd', 'pippo.db']) {
      const risposta = await applicazione.inject({
        method: 'POST',
        url: '/api/backup/ripristina',
        payload: { nomeFile },
      });
      expect(risposta.statusCode).toBe(400);
      expect(risposta.json().errore.codice).toBe('backup_non_valido');
    }

    const dopo = contesto.db
      .prepare('SELECT COUNT(*) as count FROM transactions')
      .get() as { count: number };
    expect(dopo).toEqual(prima);
  });

  it('rifiuta un file corrotto senza sostituire il database', async () => {
    const { applicazione, ctx: contesto } = creaApp();
    inserisciContoEMovimentoA(contesto);
    const prima = contesto.db
      .prepare('SELECT COUNT(*) as count FROM transactions')
      .get() as { count: number };
    const nomeFile = 'conticini-20260101-000000.db';
    const cartella = path.join(dir!, 'backup');
    mkdirSync(cartella, { recursive: true });
    writeFileSync(path.join(cartella, nomeFile), 'non è un database');

    const risposta = await applicazione.inject({
      method: 'POST',
      url: '/api/backup/ripristina',
      payload: { nomeFile },
    });

    expect(risposta.statusCode).toBe(400);
    expect(risposta.json().errore.codice).toBe('backup_non_valido');
    const dopo = contesto.db
      .prepare('SELECT COUNT(*) as count FROM transactions')
      .get() as { count: number };
    expect(dopo).toEqual(prima);
  });
});
