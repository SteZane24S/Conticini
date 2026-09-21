import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { DataISO, MovimentoConDettagli } from '@conticini/dominio';
import Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';

import { runMigrations } from '../migrations-runner.js';
import { inserisci, type ContestoScrittura } from '../scrittura.js';
import { cercaMovimenti, creaRepositorioMovimenti } from './movimenti.js';

describe('creaRepositorioMovimenti', () => {
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
    dir = mkdtempSync(path.join(tmpdir(), 'conticini-movimenti-'));
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
    inserisci(ctx, 'accounts', 'accounts', 'conto-2', {
      name: 'Secondo conto',
      initial_balance_cents: 0,
      opened_on: '2026-02-01',
      archived: 0,
    });
    inserisci(ctx, 'sectors', 'sectors', 'settore-1', { name: 'Casa' });
    inserisci(ctx, 'sectors', 'sectors', 'settore-2', { name: 'Lavoro' });
    inserisci(ctx, 'categories', 'categories', 'categoria-uscita', {
      sector_id: 'settore-1',
      name: 'Spesa',
      kind: 'uscita',
    });
    inserisci(ctx, 'categories', 'categories', 'categoria-entrata', {
      sector_id: 'settore-2',
      name: 'Stipendio',
      kind: 'entrata',
    });
  }

  function datiMovimento(
    dati: Partial<Omit<MovimentoConDettagli, 'id'>> = {},
  ): Omit<MovimentoConDettagli, 'id'> {
    return {
      data: '2026-02-10' as DataISO,
      amountCents: -1250,
      contoId: 'conto-1',
      categoriaId: 'categoria-uscita',
      descrizione: 'Spesa iniziale',
      descrizioneNorm: '',
      transferGroupId: null,
      posizioneId: null,
      ...dati,
    };
  }

  it('crea, ottiene e normalizza un movimento', async () => {
    const ctx = creaContesto();
    preparaDati(ctx);
    const repo = creaRepositorioMovimenti(ctx);

    const creato = await repo.crea(
      datiMovimento({ descrizione: 'Città Perché' }),
    );

    expect(creato).toEqual({
      id: expect.any(String),
      data: '2026-02-10',
      amountCents: -1250,
      contoId: 'conto-1',
      categoriaId: 'categoria-uscita',
      descrizione: 'Città Perché',
      descrizioneNorm: 'citta perche',
      transferGroupId: null,
      posizioneId: null,
    });
    expect(await repo.ottieni(creato.id)).toEqual(creato);
  });

  it('rifiuta conto e categoria inesistenti', async () => {
    const ctx = creaContesto();
    preparaDati(ctx);
    const repo = creaRepositorioMovimenti(ctx);

    await expect(
      repo.crea(datiMovimento({ contoId: 'conto-inesistente' })),
    ).rejects.toMatchObject({ codice: 'non_trovato' });
    await expect(
      repo.crea(datiMovimento({ categoriaId: 'categoria-inesistente' })),
    ).rejects.toMatchObject({ codice: 'non_trovato' });
  });

  it('applica le validazioni di segno e apertura del conto', async () => {
    const ctx = creaContesto();
    preparaDati(ctx);
    const repo = creaRepositorioMovimenti(ctx);

    await expect(
      repo.crea(datiMovimento({ amountCents: 1250 })),
    ).rejects.toMatchObject({
      codice: 'segno_non_coerente',
    });
    await expect(
      repo.crea(datiMovimento({ data: '2026-01-01' as DataISO })),
    ).rejects.toMatchObject({ codice: 'movimento_anteriore_apertura' });
  });

  it('elenca tutti i movimenti attivi', async () => {
    const ctx = creaContesto();
    preparaDati(ctx);
    const repo = creaRepositorioMovimenti(ctx);
    const primo = await repo.crea(
      datiMovimento({ data: '2026-02-10' as DataISO }),
    );
    const secondo = await repo.crea(
      datiMovimento({ data: '2026-02-11' as DataISO, descrizione: 'Secondo' }),
    );

    expect(await repo.elenca()).toEqual([secondo, primo]);
  });

  it('aggiorna i soli campi indicati e rivalida i valori effettivi', async () => {
    const ctx = creaContesto();
    preparaDati(ctx);
    const repo = creaRepositorioMovimenti(ctx);
    const creato = await repo.crea(datiMovimento());

    const descrizioneAggiornata = await repo.aggiorna(creato.id, {
      descrizione: 'Caffè Città',
    });

    expect(descrizioneAggiornata).toMatchObject({
      contoId: 'conto-1',
      data: '2026-02-10',
      amountCents: -1250,
      categoriaId: 'categoria-uscita',
      descrizioneNorm: 'caffe citta',
    });

    const aggiornato = await repo.aggiorna(creato.id, {
      contoId: 'conto-2',
      data: '2026-02-15' as DataISO,
    });

    expect(aggiornato).toMatchObject({
      contoId: 'conto-2',
      data: '2026-02-15',
      amountCents: -1250,
      categoriaId: 'categoria-uscita',
      descrizioneNorm: 'caffe citta',
    });
    await expect(
      repo.aggiorna(creato.id, { categoriaId: 'categoria-entrata' }),
    ).rejects.toMatchObject({ codice: 'segno_non_coerente' });
    await repo.aggiorna(creato.id, {
      categoriaId: 'categoria-entrata',
      amountCents: 1250,
    });
    await expect(
      repo.aggiorna(creato.id, { amountCents: -1250 }),
    ).rejects.toMatchObject({ codice: 'segno_non_coerente' });
    await expect(
      repo.aggiorna(creato.id, { data: '2026-01-01' as DataISO }),
    ).rejects.toMatchObject({ codice: 'movimento_anteriore_apertura' });
  });

  it('rifiuta l azzeramento della categoria su un movimento normale', async () => {
    const ctx = creaContesto();
    preparaDati(ctx);
    const repo = creaRepositorioMovimenti(ctx);
    const creato = await repo.crea(datiMovimento());

    await expect(
      repo.aggiorna(creato.id, { categoriaId: null }),
    ).rejects.toMatchObject({
      codice: 'richiesta_non_valida',
      campo: 'categoriaId',
    });
  });

  it('impedisce modifica e cancellazione dei movimenti di trasferimento', async () => {
    const ctx = creaContesto();
    preparaDati(ctx);
    inserisci(ctx, 'transactions', 'transactions', 'movimento-trasferimento', {
      date: '2026-02-10',
      amount_cents: -100,
      account_id: 'conto-1',
      category_id: null,
      description: 'Trasferimento',
      description_norm: 'trasferimento',
      transfer_group_id: 'gruppo-test',
    });
    const repo = creaRepositorioMovimenti(ctx);

    await expect(
      repo.aggiorna('movimento-trasferimento', { descrizione: 'Altro' }),
    ).rejects.toMatchObject({ codice: 'movimento_di_trasferimento' });
    await expect(repo.elimina('movimento-trasferimento')).rejects.toMatchObject(
      {
        codice: 'movimento_di_trasferimento',
      },
    );
  });

  it('cancella un movimento normale con tombstone', async () => {
    const ctx = creaContesto();
    preparaDati(ctx);
    const repo = creaRepositorioMovimenti(ctx);
    const creato = await repo.crea(datiMovimento());

    await repo.elimina(creato.id);

    expect(await repo.ottieni(creato.id)).toBeNull();
    expect(
      ctx.db
        .prepare('SELECT deleted_at FROM transactions WHERE id = ?')
        .get(creato.id),
    ).toMatchObject({ deleted_at: expect.any(String) });
  });

  it('cerca per filtri, testo normalizzato, paginazione e combinazioni', async () => {
    const ctx = creaContesto();
    preparaDati(ctx);
    const repo = creaRepositorioMovimenti(ctx);
    const primo = await repo.crea(
      datiMovimento({
        data: '2026-02-10' as DataISO,
        descrizione: 'Caffè Roma',
      }),
    );
    const secondo = await repo.crea(
      datiMovimento({
        data: '2026-02-11' as DataISO,
        contoId: 'conto-2',
        categoriaId: 'categoria-entrata',
        amountCents: 2500,
        descrizione: 'Stipendio',
      }),
    );
    const terzo = await repo.crea(
      datiMovimento({
        data: '2026-02-12' as DataISO,
        descrizione: 'Caffè Milano',
      }),
    );

    expect(
      cercaMovimenti(ctx, { contoId: 'conto-1' }, { pagina: 1, perPagina: 50 }),
    ).toMatchObject({ totale: 2, elementi: [terzo, primo] });
    expect(
      cercaMovimenti(
        ctx,
        { dataDa: '2026-02-11', dataA: '2026-02-11' },
        { pagina: 1, perPagina: 50 },
      ),
    ).toMatchObject({ totale: 1, elementi: [secondo] });
    expect(
      cercaMovimenti(
        ctx,
        { categoriaId: 'categoria-entrata' },
        { pagina: 1, perPagina: 50 },
      ),
    ).toMatchObject({ totale: 1, elementi: [secondo] });
    expect(
      cercaMovimenti(
        ctx,
        { settoreId: 'settore-1' },
        { pagina: 1, perPagina: 50 },
      ),
    ).toMatchObject({ totale: 2, elementi: [terzo, primo] });
    expect(
      cercaMovimenti(ctx, { testo: 'CAFFÈ' }, { pagina: 1, perPagina: 50 }),
    ).toMatchObject({ totale: 2, elementi: [terzo, primo] });
    expect(cercaMovimenti(ctx, {}, { pagina: 2, perPagina: 1 })).toMatchObject({
      totale: 3,
      elementi: [secondo],
    });
    expect(
      cercaMovimenti(
        ctx,
        { contoId: 'conto-1', dataDa: '2026-02-12', testo: 'milano' },
        { pagina: 1, perPagina: 50 },
      ),
    ).toMatchObject({ totale: 1, elementi: [terzo] });
  });
});
