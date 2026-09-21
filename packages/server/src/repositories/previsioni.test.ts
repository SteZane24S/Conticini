import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';

import { runMigrations } from '../migrations-runner.js';
import { inserisci } from '../scrittura.js';
import { creaRepositorioCategorie } from './categorie.js';
import { creaRepositorioBudgetDefault } from './previsioni.js';
import { creaRepositorioSettori } from './settori.js';

describe('creaRepositorioBudgetDefault', () => {
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

  function creaRepository() {
    dir = mkdtempSync(path.join(tmpdir(), 'conticini-previsioni-'));
    db = new Database(path.join(dir, 'conticini.db'));
    runMigrations(db);
    const ctx = { db, deviceId: 'device-test' };
    return {
      budgetDefaults: creaRepositorioBudgetDefault(ctx),
      categorie: creaRepositorioCategorie(ctx),
      settori: creaRepositorioSettori(ctx),
      ctx,
    };
  }

  it('rimuove un budget di default attivo', async () => {
    const { budgetDefaults, categorie, settori } = creaRepository();
    const settore = await settori.crea({ nome: 'Casa' });
    const categoria = await categorie.crea({
      nome: 'Affitto',
      kind: 'uscita',
      settoreId: settore.id,
    });
    await budgetDefaults.imposta({
      categoriaId: categoria.id,
      amountCents: 85000,
    });

    await budgetDefaults.elimina(categoria.id);

    expect(await budgetDefaults.elenca()).toEqual([]);
    const riga = db
      ?.prepare('SELECT deleted_at FROM budget_defaults WHERE category_id = ?')
      .get(categoria.id) as { deleted_at: string | null };
    expect(riga.deleted_at).not.toBeNull();
  });

  it('rimuove il budget di default e tutti gli override collegati', async () => {
    const { budgetDefaults, categorie, settori, ctx } = creaRepository();
    const settore = await settori.crea({ nome: 'Casa' });
    const categoria = await categorie.crea({
      nome: 'Affitto',
      kind: 'uscita',
      settoreId: settore.id,
    });
    await budgetDefaults.imposta({
      categoriaId: categoria.id,
      amountCents: 85000,
    });
    inserisci(ctx, 'accounts', 'accounts', 'conto-1', {
      name: 'Conto principale',
      initial_balance_cents: 0,
      opened_on: '2026-01-10',
      archived: 0,
    });
    inserisci(ctx, 'transactions', 'transactions', 'movimento-stipendio-1', {
      date: '2026-02-10',
      amount_cents: 250000,
      account_id: 'conto-1',
      category_id: null,
      description: 'Stipendio',
      description_norm: 'stipendio',
      transfer_group_id: null,
    });
    inserisci(ctx, 'transactions', 'transactions', 'movimento-stipendio-2', {
      date: '2026-03-10',
      amount_cents: 250000,
      account_id: 'conto-1',
      category_id: null,
      description: 'Stipendio',
      description_norm: 'stipendio',
      transfer_group_id: null,
    });
    inserisci(ctx, 'salary_cycles', 'salary_cycles', 'ciclo-1', {
      salary_transaction_id: 'movimento-stipendio-1',
      start_date: '2026-02-10',
      expected_next_date: '2026-03-10',
      expected_amount_cents: 250000,
    });
    inserisci(ctx, 'salary_cycles', 'salary_cycles', 'ciclo-2', {
      salary_transaction_id: 'movimento-stipendio-2',
      start_date: '2026-03-10',
      expected_next_date: '2026-04-10',
      expected_amount_cents: 250000,
    });
    inserisci(
      ctx,
      'budget_overrides',
      'budget_overrides',
      'budget-override-1',
      {
        cycle_id: 'ciclo-1',
        category_id: categoria.id,
        amount_cents: 90000,
      },
    );
    inserisci(
      ctx,
      'budget_overrides',
      'budget_overrides',
      'budget-override-2',
      {
        cycle_id: 'ciclo-2',
        category_id: categoria.id,
        amount_cents: 95000,
      },
    );

    await budgetDefaults.elimina(categoria.id);

    const budgetDefault = db
      ?.prepare('SELECT deleted_at FROM budget_defaults WHERE category_id = ?')
      .get(categoria.id) as { deleted_at: string | null };
    const overrides = db
      ?.prepare('SELECT deleted_at FROM budget_overrides WHERE category_id = ?')
      .all(categoria.id) as Array<{ deleted_at: string | null }>;
    expect(budgetDefault.deleted_at).not.toBeNull();
    expect(overrides).toHaveLength(2);
    expect(overrides.every((override) => override.deleted_at !== null)).toBe(
      true,
    );
  });

  it('rifiuta la rimozione di una categoria senza budget di default', async () => {
    const { budgetDefaults, categorie, settori } = creaRepository();
    const settore = await settori.crea({ nome: 'Casa' });
    const categoria = await categorie.crea({
      nome: 'Affitto',
      kind: 'uscita',
      settoreId: settore.id,
    });

    await expect(budgetDefaults.elimina(categoria.id)).rejects.toMatchObject({
      codice: 'non_trovato',
    });
  });
});
