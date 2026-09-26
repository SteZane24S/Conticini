import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';

import { runMigrations } from '../migrations-runner.js';
import { inserisci, type ContestoScrittura } from '../scrittura.js';
import {
  collegaOccorrenza,
  confermaOccorrenza,
  creaRepositorioOccorrenze,
  elencaOccorrenzePending,
  saltaOccorrenza,
} from './occorrenze.js';

describe('occorrenze', () => {
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
    dir = mkdtempSync(path.join(tmpdir(), 'conticini-occorrenze-'));
    db = new Database(path.join(dir, 'conticini.db'));
    runMigrations(db);
    return { db, deviceId: 'device-test' };
  }

  function preparaDati(ctx: ContestoScrittura): void {
    inserisci(ctx, 'accounts', 'accounts', 'conto-1', {
      name: 'Conto principale',
      initial_balance_cents: 0,
      opened_on: '2026-01-01',
      archived: 0,
    });
    inserisci(ctx, 'sectors', 'sectors', 'settore-1', { name: 'Casa' });
    inserisci(ctx, 'categories', 'categories', 'categoria-1', {
      sector_id: 'settore-1',
      name: 'Bollette',
      kind: 'uscita',
    });
    inserisci(ctx, 'recurring_expenses', 'recurring_expenses', 'ricorrenza-1', {
      name: 'Luce e gas',
      rule_type: 'monthly',
      interval: null,
      anchor_day: 5,
      anchor_month: null,
      start_date: '2026-01-05',
      end_date: null,
      amount_cents: 8500,
      account_id: 'conto-1',
      category_id: 'categoria-1',
      mode: 'manual',
      active: 1,
    });
  }

  function inserisciOccorrenza(
    ctx: ContestoScrittura,
    id: string,
    dati: Partial<{
      period: string;
      dueDate: string;
      amountCents: number;
      mode: 'auto' | 'manual';
      status: 'pending' | 'paid' | 'skipped';
      transactionId: string | null;
    }> = {},
  ): void {
    inserisci(ctx, 'recurring_occurrences', 'recurring_occurrences', id, {
      recurring_id: 'ricorrenza-1',
      period: dati.period ?? id,
      due_date: dati.dueDate ?? '2026-02-05',
      amount_cents: dati.amountCents ?? 8500,
      account_id: 'conto-1',
      category_id: 'categoria-1',
      mode: dati.mode ?? 'manual',
      status: dati.status ?? 'pending',
      transaction_id: dati.transactionId ?? null,
    });
  }

  function inserisciMovimento(ctx: ContestoScrittura, id: string): void {
    inserisci(ctx, 'transactions', 'transactions', id, {
      date: '2026-02-06',
      amount_cents: -8500,
      account_id: 'conto-1',
      category_id: 'categoria-1',
      description: 'Movimento esistente',
      description_norm: 'movimento esistente',
      transfer_group_id: null,
    });
  }

  it('elenca solo le occorrenze pending ordinate per scadenza', () => {
    const ctx = creaContesto();
    preparaDati(ctx);
    inserisciOccorrenza(ctx, 'pending-tarda', { dueDate: '2026-03-05' });
    inserisciOccorrenza(ctx, 'pending-presto', { dueDate: '2026-02-05' });
    inserisciOccorrenza(ctx, 'pending-auto', {
      dueDate: '2026-01-05',
      mode: 'auto',
    });
    inserisciOccorrenza(ctx, 'paid', { status: 'paid' });
    inserisciOccorrenza(ctx, 'skipped', { status: 'skipped' });

    expect(
      elencaOccorrenzePending(ctx).map((occorrenza) => occorrenza.id),
    ).toEqual(['pending-presto', 'pending-tarda']);
  });

  it('conferma con i valori previsti e crea il movimento in uscita', () => {
    const ctx = creaContesto();
    preparaDati(ctx);
    inserisciOccorrenza(ctx, 'occorrenza-1');

    const occorrenza = confermaOccorrenza(ctx, 'occorrenza-1');
    const movimento = ctx.db
      .prepare(
        'SELECT date, amount_cents, account_id, description, description_norm FROM transactions WHERE id = (SELECT transaction_id FROM recurring_occurrences WHERE id = ?)',
      )
      .get('occorrenza-1');

    expect(occorrenza).toMatchObject({
      id: 'occorrenza-1',
      stato: 'paid',
      movimentoCollegato: { data: '2026-02-05' },
    });
    expect(movimento).toEqual({
      date: '2026-02-05',
      amount_cents: -8500,
      account_id: null,
      description: 'Luce e gas',
      description_norm: 'luce e gas',
    });
  });

  it('conferma con data e importo corretti senza modificare lo snapshot', () => {
    const ctx = creaContesto();
    preparaDati(ctx);
    inserisciOccorrenza(ctx, 'occorrenza-1');

    const occorrenza = confermaOccorrenza(ctx, 'occorrenza-1', {
      data: '2026-02-07',
      amountCents: 9000,
    });
    const riga = ctx.db
      .prepare(
        'SELECT due_date, amount_cents FROM recurring_occurrences WHERE id = ?',
      )
      .get('occorrenza-1');
    const movimento = ctx.db
      .prepare(
        'SELECT date, amount_cents, account_id FROM transactions WHERE id = (SELECT transaction_id FROM recurring_occurrences WHERE id = ?)',
      )
      .get('occorrenza-1');

    expect(occorrenza.movimentoCollegato).toEqual({ data: '2026-02-07' });
    expect(riga).toEqual({ due_date: '2026-02-05', amount_cents: 8500 });
    expect(movimento).toEqual({
      date: '2026-02-07',
      amount_cents: -9000,
      account_id: null,
    });
  });

  it('rifiuta la conferma di un occorrenza già pagata', () => {
    const ctx = creaContesto();
    preparaDati(ctx);
    inserisciOccorrenza(ctx, 'occorrenza-1', { status: 'paid' });

    expect(() => confermaOccorrenza(ctx, 'occorrenza-1')).toThrow(
      'Questa occorrenza non è più in attesa.',
    );
  });

  it('salta un occorrenza pending senza creare movimenti', () => {
    const ctx = creaContesto();
    preparaDati(ctx);
    inserisciOccorrenza(ctx, 'occorrenza-1');

    expect(saltaOccorrenza(ctx, 'occorrenza-1')).toMatchObject({
      stato: 'skipped',
      movimentoCollegato: null,
    });
    expect(
      ctx.db.prepare('SELECT COUNT(*) AS totale FROM transactions').get(),
    ).toEqual({ totale: 0 });
  });

  it('rifiuta il collegamento a un movimento inesistente', () => {
    const ctx = creaContesto();
    preparaDati(ctx);
    inserisciOccorrenza(ctx, 'occorrenza-1');

    expect(() => collegaOccorrenza(ctx, 'occorrenza-1', 'inesistente')).toThrow(
      'movimento non trovato: inesistente',
    );
  });

  it('rifiuta il collegamento di un movimento già associato', () => {
    const ctx = creaContesto();
    preparaDati(ctx);
    inserisciMovimento(ctx, 'movimento-1');
    inserisciOccorrenza(ctx, 'occorrenza-1', {
      status: 'paid',
      transactionId: 'movimento-1',
    });
    inserisciOccorrenza(ctx, 'occorrenza-2');

    try {
      collegaOccorrenza(ctx, 'occorrenza-2', 'movimento-1');
      throw new Error('Il collegamento duplicato doveva fallire.');
    } catch (error) {
      expect(error).toMatchObject({
        codice: 'movimento_gia_collegato',
        message: "Questo movimento è già collegato a un'altra occorrenza.",
      });
    }
  });

  it('restituisce tutte le occorrenze dal repository, comprese quelle chiuse', async () => {
    const ctx = creaContesto();
    preparaDati(ctx);
    inserisciOccorrenza(ctx, 'pending', { dueDate: '2026-01-05' });
    inserisciOccorrenza(ctx, 'paid', {
      dueDate: '2026-02-05',
      status: 'paid',
    });
    inserisciOccorrenza(ctx, 'skipped', {
      dueDate: '2026-03-05',
      status: 'skipped',
    });

    expect(
      (await creaRepositorioOccorrenze(ctx).elenca()).map((riga) => riga.id),
    ).toEqual(['pending', 'paid', 'skipped']);
  });
});
