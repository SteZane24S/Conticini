import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';

import { runMigrations } from '../migrations-runner.js';
import type { ContestoScrittura } from '../scrittura.js';
import {
  annullaSaldamento,
  creaRepositorioPosizioni,
  saldaPosizione,
} from './posizioni.js';

describe('repository posizioni', () => {
  let dir: string | undefined;
  let db: Database.Database | undefined;

  afterEach(() => {
    db?.close();
    db = undefined;
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
      dir = undefined;
    }
  });

  function creaContesto(): ContestoScrittura {
    dir = mkdtempSync(path.join(tmpdir(), 'conticini-posizioni-'));
    db = new Database(path.join(dir, 'conticini.db'));
    runMigrations(db);
    return { db, deviceId: 'device-test' };
  }

  it('crea un debito con residuo uguale all importo iniziale', async () => {
    const ctx = creaContesto();
    const posizione = await creaRepositorioPosizioni(ctx).crea({
      descrizione: 'Prestito da restituire',
      verso: 'debito',
      importoInizialeCents: -20000,
    });

    expect(posizione).toMatchObject({
      descrizione: 'Prestito da restituire',
      verso: 'debito',
      importoInizialeCents: -20000,
      residuoCents: -20000,
    });
  });

  it('saldando in parte un debito riduce il residuo senza conto', async () => {
    const ctx = creaContesto();
    const repo = creaRepositorioPosizioni(ctx);
    const posizione = await repo.crea({
      descrizione: 'Prestito',
      verso: 'debito',
      importoInizialeCents: -20000,
    });

    const saldamento = saldaPosizione(ctx, posizione.id, {
      importoCents: 5000,
      data: '2026-09-21',
      operazioneId: 'parziale-1',
    });

    expect(saldamento.movimento.amountCents).toBe(-5000);
    expect(saldamento.movimento.contoId).toBeNull();
    expect(saldamento.posizione.residuoCents).toBe(-15000);
  });

  it('rifiuta un saldamento che supera il residuo', async () => {
    const ctx = creaContesto();
    const posizione = await creaRepositorioPosizioni(ctx).crea({
      descrizione: 'Prestito',
      verso: 'debito',
      importoInizialeCents: -20000,
    });

    expect(() =>
      saldaPosizione(ctx, posizione.id, {
        importoCents: 20001,
        data: '2026-09-21',
        operazioneId: 'troppo',
      }),
    ).toThrow(expect.objectContaining({ codice: 'importo_supera_residuo' }));
  });

  it('rende idempotente un saldamento con lo stesso operazioneId', async () => {
    const ctx = creaContesto();
    const posizione = await creaRepositorioPosizioni(ctx).crea({
      descrizione: 'Prestito',
      verso: 'debito',
      importoInizialeCents: -20000,
    });
    const dati = {
      importoCents: 5000,
      data: '2026-09-21',
      operazioneId: 'replay',
    };

    saldaPosizione(ctx, posizione.id, dati);
    saldaPosizione(ctx, posizione.id, dati);

    expect(
      ctx.db
        .prepare(
          'SELECT COUNT(*) AS totale FROM transactions WHERE linked_position_id = ? AND deleted_at IS NULL',
        )
        .get(posizione.id),
    ).toEqual({ totale: 1 });
  });

  it('rende idempotente il replay di un saldamento totale', async () => {
    const ctx = creaContesto();
    const posizione = await creaRepositorioPosizioni(ctx).crea({
      descrizione: 'Prestito',
      verso: 'debito',
      importoInizialeCents: -20000,
    });
    const dati = {
      importoCents: 20000,
      data: '2026-09-21',
      operazioneId: 'replay-totale',
    };

    saldaPosizione(ctx, posizione.id, dati);
    const replay = saldaPosizione(ctx, posizione.id, dati);

    expect(replay.posizione.residuoCents).toBe(0);
    expect(
      ctx.db
        .prepare(
          'SELECT COUNT(*) AS totale FROM transactions WHERE linked_position_id = ? AND deleted_at IS NULL',
        )
        .get(posizione.id),
    ).toEqual({ totale: 1 });
  });

  it('rifiuta un operazioneId riusato con dati diversi', async () => {
    const ctx = creaContesto();
    const posizione = await creaRepositorioPosizioni(ctx).crea({
      descrizione: 'Prestito',
      verso: 'debito',
      importoInizialeCents: -20000,
    });
    saldaPosizione(ctx, posizione.id, {
      importoCents: 5000,
      data: '2026-09-21',
      operazioneId: 'conflitto',
    });

    expect(() =>
      saldaPosizione(ctx, posizione.id, {
        importoCents: 6000,
        data: '2026-09-21',
        operazioneId: 'conflitto',
      }),
    ).toThrow(expect.objectContaining({ codice: 'saldamento_in_conflitto' }));

    expect(() =>
      saldaPosizione(ctx, posizione.id, {
        importoCents: 5000,
        data: '2026-09-22',
        operazioneId: 'conflitto',
      }),
    ).toThrow(expect.objectContaining({ codice: 'saldamento_in_conflitto' }));
  });

  it('annullando un saldamento ripristina il residuo', async () => {
    const ctx = creaContesto();
    const posizione = await creaRepositorioPosizioni(ctx).crea({
      descrizione: 'Prestito',
      verso: 'debito',
      importoInizialeCents: -20000,
    });
    const saldamento = saldaPosizione(ctx, posizione.id, {
      importoCents: 5000,
      data: '2026-09-21',
      operazioneId: 'annulla',
    });

    const posizioneAnnullata = annullaSaldamento(ctx, saldamento.movimento.id);

    expect(posizioneAnnullata.residuoCents).toBe(-20000);
  });

  it('rifiuta di eliminare una posizione con saldamenti collegati', async () => {
    const ctx = creaContesto();
    const repo = creaRepositorioPosizioni(ctx);
    const posizione = await repo.crea({
      descrizione: 'Prestito',
      verso: 'debito',
      importoInizialeCents: -20000,
    });
    saldaPosizione(ctx, posizione.id, {
      importoCents: 5000,
      data: '2026-09-21',
      operazioneId: 'eliminazione',
    });

    await expect(repo.elimina(posizione.id)).rejects.toMatchObject({
      codice: 'posizione_con_saldamenti',
    });
  });

  it('registra un credito con i segni opposti', async () => {
    const ctx = creaContesto();
    const posizione = await creaRepositorioPosizioni(ctx).crea({
      descrizione: 'Prestito concesso',
      verso: 'credito',
      importoInizialeCents: 20000,
    });

    const saldamento = saldaPosizione(ctx, posizione.id, {
      importoCents: 5000,
      data: '2026-09-21',
      operazioneId: 'credito',
    });

    expect(saldamento.movimento.amountCents).toBe(5000);
    expect(saldamento.movimento.contoId).toBeNull();
    expect(saldamento.posizione.residuoCents).toBe(15000);
  });
});
