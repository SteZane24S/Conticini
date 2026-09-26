import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { RicorrenzaFissa } from '@conticini/dominio';
import Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';

import { runMigrations } from '../migrations-runner.js';
import { inserisci, type ContestoScrittura } from '../scrittura.js';
import { creaRepositorioSpeseFisse } from './speseFisse.js';

describe('creaRepositorioSpeseFisse', () => {
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
    dir = mkdtempSync(path.join(tmpdir(), 'conticini-spese-fisse-'));
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
    inserisci(ctx, 'categories', 'categories', 'categoria-uscita', {
      sector_id: 'settore-1',
      name: 'Affitto',
      kind: 'uscita',
    });
    inserisci(ctx, 'categories', 'categories', 'categoria-entrata', {
      sector_id: 'settore-1',
      name: 'Stipendio',
      kind: 'entrata',
    });
  }

  function datiSpesa(
    dati: Partial<Omit<RicorrenzaFissa, 'id'>> = {},
  ): Omit<RicorrenzaFissa, 'id'> {
    return {
      nome: 'Affitto',
      regola: {
        tipo: 'monthly',
        anchorDay: 5,
        startDate: '2026-01-05',
      },
      amountCents: 85000,
      contoId: 'conto-1',
      categoriaId: 'categoria-uscita',
      mode: 'auto',
      active: true,
      ...dati,
    };
  }

  it.each([
    {
      nome: 'mensile',
      regola: { tipo: 'monthly', anchorDay: 5, startDate: '2026-01-05' },
    },
    {
      nome: 'ogni n mesi',
      regola: {
        tipo: 'every_n_months',
        n: 3,
        anchorMonth: 2,
        anchorDay: 5,
        startDate: '2026-01-05',
      },
    },
    {
      nome: 'annuale',
      regola: {
        tipo: 'yearly',
        anchorMonth: 2,
        anchorDay: 5,
        startDate: '2026-01-05',
      },
    },
  ] as const)(
    'crea una spesa fissa con ricorrenza $nome',
    async ({ regola }) => {
      const ctx = creaContesto();
      preparaDati(ctx);
      const repo = creaRepositorioSpeseFisse(ctx);

      const creata = await repo.crea(datiSpesa({ regola }));

      expect(await repo.ottieni(creata.id)).toEqual({
        ...datiSpesa({ regola }),
        contoId: null,
        id: creata.id,
      });
    },
  );

  it('rifiuta una categoria di entrata', async () => {
    const ctx = creaContesto();
    preparaDati(ctx);
    const repo = creaRepositorioSpeseFisse(ctx);

    await expect(
      repo.crea(datiSpesa({ categoriaId: 'categoria-entrata' })),
    ).rejects.toMatchObject({
      codice: 'richiesta_non_valida',
      campo: 'categoriaId',
    });
  });

  it('rifiuta una spesa fissa attiva per una categoria con previsione', async () => {
    const ctx = creaContesto();
    preparaDati(ctx);
    inserisci(ctx, 'budget_defaults', 'budget_defaults', 'previsione-1', {
      category_id: 'categoria-uscita',
      amount_cents: 10000,
    });
    const repo = creaRepositorioSpeseFisse(ctx);

    await expect(repo.crea(datiSpesa())).rejects.toMatchObject({
      codice: 'previsione_e_fissa_su_stessa_categoria',
      campo: 'categoriaId',
    });
  });

  it('propaga l importo aggiornato solo alle occorrenze pending', async () => {
    const ctx = creaContesto();
    preparaDati(ctx);
    const repo = creaRepositorioSpeseFisse(ctx);
    const spesa = await repo.crea(datiSpesa());

    inserisci(
      ctx,
      'recurring_occurrences',
      'recurring_occurrences',
      'pending-1',
      {
        recurring_id: spesa.id,
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
    inserisci(ctx, 'recurring_occurrences', 'recurring_occurrences', 'paid-1', {
      recurring_id: spesa.id,
      period: '2026-01',
      due_date: '2026-01-05',
      amount_cents: 85000,
      account_id: 'conto-1',
      category_id: 'categoria-uscita',
      mode: 'auto',
      status: 'paid',
      transaction_id: null,
    });

    await repo.aggiorna(spesa.id, { amountCents: 90000 });

    expect(
      ctx.db
        .prepare(
          'SELECT amount_cents, account_id FROM recurring_occurrences WHERE id = ?',
        )
        .get('pending-1'),
    ).toEqual({ amount_cents: 90000, account_id: 'conto-1' });
    expect(
      ctx.db
        .prepare(
          'SELECT amount_cents, account_id FROM recurring_occurrences WHERE id = ?',
        )
        .get('paid-1'),
    ).toEqual({ amount_cents: 85000, account_id: 'conto-1' });
  });
});
