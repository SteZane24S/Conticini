import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';

import { ID_CATEGORIA_TECNICA_INCASSO_CREDITI } from '@conticini/dominio';

import { runMigrations } from '../migrations-runner.js';
import { inserisci, type ContestoScrittura } from '../scrittura.js';
import { creaStipendio } from './stipendi.js';

describe('creaStipendio', () => {
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
    dir = mkdtempSync(path.join(tmpdir(), 'conticini-stipendi-'));
    db = new Database(path.join(dir, 'conticini.db'));
    runMigrations(db);
    return { db, deviceId: 'device-test' };
  }

  function preparaDati(ctx: ContestoScrittura) {
    inserisci(ctx, 'accounts', 'accounts', 'conto-1', {
      name: 'Conto principale',
      initial_balance_cents: 0,
      opened_on: '2026-01-10',
      archived: 0,
    });
    inserisci(ctx, 'sectors', 'sectors', 'settore-1', { name: 'Lavoro' });
    inserisci(ctx, 'categories', 'categories', 'categoria-entrata', {
      sector_id: 'settore-1',
      name: 'Stipendio',
      kind: 'entrata',
    });
    inserisci(ctx, 'categories', 'categories', 'categoria-uscita', {
      sector_id: 'settore-1',
      name: 'Spesa',
      kind: 'uscita',
    });
  }

  function datiStipendio(dati: Record<string, unknown> = {}) {
    return {
      data: '2026-02-10',
      amountCents: 250000,
      contoId: 'conto-1',
      categoriaId: 'categoria-entrata',
      descrizione: 'Stipendio febbraio',
      expectedNextDate: '2026-03-10',
      expectedAmountCents: 250000,
      ...dati,
    };
  }

  it('crea insieme il movimento di entrata e il ciclo salariale', () => {
    const ctx = creaContesto();
    preparaDati(ctx);

    const creato = creaStipendio(ctx, datiStipendio());

    expect(creato.movimento).toEqual({
      id: expect.any(String),
      data: '2026-02-10',
      amountCents: 250000,
      contoId: null,
      categoriaId: 'categoria-entrata',
      descrizione: 'Stipendio febbraio',
      descrizioneNorm: 'stipendio febbraio',
      transferGroupId: null,
      posizioneId: null,
    });
    expect(creato.ciclo).toEqual({
      id: expect.any(String),
      startDate: '2026-02-10',
      expectedNextDate: '2026-03-10',
      expectedAmountCents: 250000,
      salaryTransactionId: creato.movimento.id,
    });
  });

  it('rifiuta una categoria che non sia di entrata', () => {
    const ctx = creaContesto();
    preparaDati(ctx);

    expect(() =>
      creaStipendio(ctx, datiStipendio({ categoriaId: 'categoria-uscita' })),
    ).toThrow(
      expect.objectContaining({
        codice: 'richiesta_non_valida',
        campo: 'categoriaId',
      }),
    );
  });

  it('rifiuta una categoria tecnica', () => {
    const ctx = creaContesto();
    preparaDati(ctx);

    expect(() =>
      creaStipendio(
        ctx,
        datiStipendio({
          categoriaId: ID_CATEGORIA_TECNICA_INCASSO_CREDITI,
        }),
      ),
    ).toThrow(
      expect.objectContaining({
        codice: 'categoria_tecnica',
        campo: 'categoriaId',
      }),
    );
  });

  it('crea lo stipendio ignorando un conto inesistente', () => {
    const ctx = creaContesto();
    preparaDati(ctx);

    const creato = creaStipendio(
      ctx,
      datiStipendio({ contoId: 'conto-inesistente' }),
    );

    expect(creato.movimento.contoId).toBeNull();
  });
});
