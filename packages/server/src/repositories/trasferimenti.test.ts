import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';

import { runMigrations } from '../migrations-runner.js';
import { inserisci, type ContestoScrittura } from '../scrittura.js';
import {
  aggiornaTrasferimento,
  creaTrasferimento,
  eliminaTrasferimento,
  ottieniTrasferimento,
} from './trasferimenti.js';

describe('trasferimenti', () => {
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
    dir = mkdtempSync(path.join(tmpdir(), 'conticini-trasferimenti-'));
    db = new Database(path.join(dir, 'conticini.db'));
    runMigrations(db);
    const ctx = { db, deviceId: 'device-test' };
    inserisci(ctx, 'accounts', 'accounts', 'conto-1', {
      name: 'Conto principale',
      initial_balance_cents: 0,
      opened_on: '2026-01-10',
      archived: 0,
    });
    inserisci(ctx, 'accounts', 'accounts', 'conto-2', {
      name: 'Secondo conto',
      initial_balance_cents: 0,
      opened_on: '2026-02-01',
      archived: 0,
    });
    inserisci(ctx, 'accounts', 'accounts', 'conto-3', {
      name: 'Terzo conto',
      initial_balance_cents: 0,
      opened_on: '2026-03-01',
      archived: 0,
    });
    inserisci(ctx, 'accounts', 'accounts', 'conto-4', {
      name: 'Quarto conto',
      initial_balance_cents: 0,
      opened_on: '2026-01-01',
      archived: 0,
    });
    return ctx;
  }

  function dati(
    dati: Partial<{
      data: string;
      amountCents: number;
      contoOrigineId: string;
      contoDestinazioneId: string;
      descrizione: string;
    }> = {},
  ) {
    return {
      data: '2026-02-10',
      amountCents: 1200,
      contoOrigineId: 'conto-1',
      contoDestinazioneId: 'conto-2',
      descrizione: 'Giroconto iniziale',
      ...dati,
    };
  }

  it('crea entrambe le gambe coerenti del trasferimento', () => {
    const ctx = creaContesto();
    const creato = creaTrasferimento(ctx, dati());
    const righe = ctx.db
      .prepare(
        'SELECT transfer_group_id, amount_cents, category_id, date, description FROM transactions WHERE transfer_group_id = ? ORDER BY amount_cents',
      )
      .all(creato.transferGroupId) as Array<{
      transfer_group_id: string;
      amount_cents: number;
      category_id: string | null;
      date: string;
      description: string;
    }>;

    expect(righe).toEqual([
      {
        transfer_group_id: creato.transferGroupId,
        amount_cents: -1200,
        category_id: null,
        date: '2026-02-10',
        description: 'Giroconto iniziale',
      },
      {
        transfer_group_id: creato.transferGroupId,
        amount_cents: 1200,
        category_id: null,
        date: '2026-02-10',
        description: 'Giroconto iniziale',
      },
    ]);
    expect(creato.movimenti.map((movimento) => movimento.amountCents)).toEqual([
      -1200, 1200,
    ]);
  });

  it('rifiuta i conti inesistenti e lo stesso conto', () => {
    const ctx = creaContesto();

    expect(() =>
      creaTrasferimento(ctx, dati({ contoOrigineId: 'inesistente' })),
    ).toThrow(expect.objectContaining({ codice: 'non_trovato' }));
    expect(() =>
      creaTrasferimento(ctx, dati({ contoDestinazioneId: 'inesistente' })),
    ).toThrow(expect.objectContaining({ codice: 'non_trovato' }));
    expect(() =>
      creaTrasferimento(ctx, dati({ contoDestinazioneId: 'conto-1' })),
    ).toThrow(expect.objectContaining({ codice: 'stesso_conto' }));
  });

  it('rifiuta importi non positivi senza lasciare gambe nel database', () => {
    const ctx = creaContesto();

    expect(() => creaTrasferimento(ctx, dati({ amountCents: 0 }))).toThrow(
      expect.objectContaining({ codice: 'richiesta_non_valida' }),
    );
    expect(() => creaTrasferimento(ctx, dati({ amountCents: -100 }))).toThrow(
      expect.objectContaining({ codice: 'richiesta_non_valida' }),
    );
    expect(
      ctx.db.prepare('SELECT COUNT(*) AS totale FROM transactions').get() as {
        totale: number;
      },
    ).toEqual({ totale: 0 });
  });

  it('rifiuta importi non positivi anche durante l aggiornamento', () => {
    const ctx = creaContesto();
    const creato = creaTrasferimento(ctx, dati());

    expect(() =>
      aggiornaTrasferimento(ctx, creato.transferGroupId, { amountCents: 0 }),
    ).toThrow(expect.objectContaining({ codice: 'richiesta_non_valida' }));
    expect(() =>
      aggiornaTrasferimento(ctx, creato.transferGroupId, { amountCents: -100 }),
    ).toThrow(expect.objectContaining({ codice: 'richiesta_non_valida' }));
    expect(ottieniTrasferimento(ctx, creato.transferGroupId)).toEqual(creato);
  });

  it('rifiuta una data anteriore all apertura di uno dei conti', () => {
    const ctx = creaContesto();

    expect(() => creaTrasferimento(ctx, dati({ data: '2026-01-15' }))).toThrow(
      expect.objectContaining({ codice: 'movimento_anteriore_apertura' }),
    );
  });

  it('ottiene solo gruppi validi e non include movimenti normali', () => {
    const ctx = creaContesto();
    inserisci(ctx, 'transactions', 'transactions', 'movimento-normale', {
      date: '2026-02-10',
      amount_cents: -100,
      account_id: 'conto-1',
      category_id: null,
      description: 'Normale',
      description_norm: 'normale',
      transfer_group_id: null,
    });
    const creato = creaTrasferimento(ctx, dati());

    expect(ottieniTrasferimento(ctx, 'inesistente')).toBeNull();
    expect(ottieniTrasferimento(ctx, creato.transferGroupId)).toEqual(creato);
  });

  it('aggiorna descrizione e importi su entrambe le gambe', () => {
    const ctx = creaContesto();
    const creato = creaTrasferimento(ctx, dati({ amountCents: 1250 }));
    const descrizione = aggiornaTrasferimento(ctx, creato.transferGroupId, {
      descrizione: 'Nuova descrizione',
    });
    const importo = aggiornaTrasferimento(ctx, creato.transferGroupId, {
      amountCents: 2500,
    });

    expect(
      descrizione.movimenti.map((movimento) => movimento.descrizione),
    ).toEqual(['Nuova descrizione', 'Nuova descrizione']);
    expect(descrizione.movimenti.map((movimento) => movimento.contoId)).toEqual(
      ['conto-1', 'conto-2'],
    );
    expect(
      descrizione.movimenti.map((movimento) => movimento.amountCents),
    ).toEqual([-1250, 1250]);
    expect(importo.movimenti.map((movimento) => movimento.amountCents)).toEqual(
      [-2500, 2500],
    );
  });

  it('non aggiorna o registra una gamba invariata quando cambia solo il conto origine', () => {
    const ctx = creaContesto();
    const creato = creaTrasferimento(ctx, dati());
    ctx.db
      .prepare(
        'UPDATE transactions SET updated_at = ? WHERE transfer_group_id = ?',
      )
      .run('2000-01-01T00:00:00.000Z', creato.transferGroupId);
    const prima = ctx.db
      .prepare(
        'SELECT id, revision, updated_at, amount_cents FROM transactions WHERE transfer_group_id = ? ORDER BY amount_cents',
      )
      .all(creato.transferGroupId) as Array<{
      id: string;
      revision: string;
      updated_at: string;
      amount_cents: number;
    }>;

    aggiornaTrasferimento(ctx, creato.transferGroupId, {
      contoOrigineId: 'conto-4',
    });

    const dopo = ctx.db
      .prepare(
        'SELECT id, revision, updated_at, amount_cents FROM transactions WHERE transfer_group_id = ? ORDER BY amount_cents',
      )
      .all(creato.transferGroupId) as Array<{
      id: string;
      revision: string;
      updated_at: string;
      amount_cents: number;
    }>;
    const originePrima = prima.find((riga) => riga.amount_cents < 0)!;
    const destinazionePrima = prima.find((riga) => riga.amount_cents > 0)!;
    const origineDopo = dopo.find((riga) => riga.amount_cents < 0)!;
    const destinazioneDopo = dopo.find((riga) => riga.amount_cents > 0)!;

    expect(origineDopo.revision).not.toBe(originePrima.revision);
    expect(origineDopo.updated_at).not.toBe(originePrima.updated_at);
    expect(destinazioneDopo.revision).toBe(destinazionePrima.revision);
    expect(destinazioneDopo.updated_at).toBe(destinazionePrima.updated_at);
  });

  it('ri-valida il conto modificato e rifiuta gruppi inesistenti', () => {
    const ctx = creaContesto();
    const creato = creaTrasferimento(ctx, dati());
    const aggiornato = aggiornaTrasferimento(ctx, creato.transferGroupId, {
      contoDestinazioneId: 'conto-4',
    });

    expect(aggiornato.contoDestinazioneId).toBe('conto-4');
    expect(() =>
      aggiornaTrasferimento(ctx, aggiornato.transferGroupId, {
        contoDestinazioneId: 'conto-3',
      }),
    ).toThrow(
      expect.objectContaining({ codice: 'movimento_anteriore_apertura' }),
    );
    expect(() =>
      aggiornaTrasferimento(ctx, 'inesistente', { descrizione: 'x' }),
    ).toThrow(expect.objectContaining({ codice: 'non_trovato' }));
  });

  it('elimina entrambe le gambe con tombstone e rifiuta gruppi inesistenti', () => {
    const ctx = creaContesto();
    const creato = creaTrasferimento(ctx, dati());
    eliminaTrasferimento(ctx, creato.transferGroupId);
    const righe = ctx.db
      .prepare(
        'SELECT deleted_at FROM transactions WHERE transfer_group_id = ?',
      )
      .all(creato.transferGroupId) as Array<{ deleted_at: string | null }>;

    expect(righe).toHaveLength(2);
    expect(righe.every((riga) => riga.deleted_at !== null)).toBe(true);
    expect(() => eliminaTrasferimento(ctx, 'inesistente')).toThrow(
      expect.objectContaining({ codice: 'non_trovato' }),
    );
  });
});
