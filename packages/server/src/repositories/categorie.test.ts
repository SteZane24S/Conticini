import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';

import {
  ID_CATEGORIA_TECNICA_INCASSO_CREDITI,
  ID_CATEGORIA_TECNICA_PAGAMENTO_DEBITI,
} from '@conticini/dominio';

import { runMigrations } from '../migrations-runner.js';
import { creaRepositorioSettori } from './settori.js';
import {
  creaCategoriaConSettoreEventuale,
  creaRepositorioCategorie,
} from './categorie.js';
import { creaRepositorioBudgetDefault } from './previsioni.js';

describe('creaRepositorioCategorie', () => {
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
    dir = mkdtempSync(path.join(tmpdir(), 'conticini-categorie-'));
    db = new Database(path.join(dir, 'conticini.db'));
    runMigrations(db);
    const ctx = { db, deviceId: 'device-test' };
    return {
      categorie: creaRepositorioCategorie(ctx),
      settori: creaRepositorioSettori(ctx),
      ctx,
    };
  }

  it('crea e ottiene una categoria con un settore esistente', async () => {
    const { categorie, settori } = creaRepository();
    const settore = await settori.crea({ nome: 'Casa' });

    const creata = await categorie.crea({
      nome: 'Affitto',
      kind: 'uscita',
      settoreId: settore.id,
    });

    expect(await categorie.ottieni(creata.id)).toEqual(creata);
  });

  it('rifiuta la creazione con un settore inesistente', async () => {
    const { categorie } = creaRepository();

    await expect(
      categorie.crea({
        nome: 'Affitto',
        kind: 'uscita',
        settoreId: 'id-inesistente',
      }),
    ).rejects.toMatchObject({ codice: 'non_trovato' });
  });

  it('rifiuta un nome duplicato nello stesso settore', async () => {
    const { categorie, settori } = creaRepository();
    const settore = await settori.crea({ nome: 'Casa' });
    await categorie.crea({
      nome: 'Affitto',
      kind: 'uscita',
      settoreId: settore.id,
    });

    await expect(
      categorie.crea({
        nome: 'Affitto',
        kind: 'uscita',
        settoreId: settore.id,
      }),
    ).rejects.toMatchObject({ codice: 'nome_duplicato' });
  });

  it('permette lo stesso nome in settori diversi', async () => {
    const { categorie, settori } = creaRepository();
    const casa = await settori.crea({ nome: 'Casa' });
    const lavoro = await settori.crea({ nome: 'Lavoro' });

    const prima = await categorie.crea({
      nome: 'Varie',
      kind: 'uscita',
      settoreId: casa.id,
    });
    const seconda = await categorie.crea({
      nome: 'Varie',
      kind: 'entrata',
      settoreId: lavoro.id,
    });

    expect(seconda.id).not.toBe(prima.id);
  });

  it('rifiuta lo spostamento in un settore con una categoria omonima', async () => {
    const { categorie, settori } = creaRepository();
    const casa = await settori.crea({ nome: 'Casa' });
    const lavoro = await settori.crea({ nome: 'Lavoro' });
    const varieCasa = await categorie.crea({
      nome: 'Varie',
      kind: 'uscita',
      settoreId: casa.id,
    });
    const varieLavoro = await categorie.crea({
      nome: 'Varie',
      kind: 'entrata',
      settoreId: lavoro.id,
    });

    await expect(
      categorie.aggiorna(varieLavoro.id, { settoreId: casa.id }),
    ).rejects.toMatchObject({ codice: 'nome_duplicato' });

    expect(varieCasa.id).not.toBe(varieLavoro.id);
  });

  it('elenca le categorie create', async () => {
    const { categorie, settori } = creaRepository();
    const settore = await settori.crea({ nome: 'Casa' });
    const prima = await categorie.crea({
      nome: 'Affitto',
      kind: 'uscita',
      settoreId: settore.id,
    });
    const seconda = await categorie.crea({
      nome: 'Utenze',
      kind: 'uscita',
      settoreId: settore.id,
    });

    const elenco = await categorie.elenca();
    const idTecnici = new Set([
      ID_CATEGORIA_TECNICA_INCASSO_CREDITI,
      ID_CATEGORIA_TECNICA_PAGAMENTO_DEBITI,
    ]);
    expect(elenco.filter((c) => !idTecnici.has(c.id))).toEqual([
      prima,
      seconda,
    ]);
  });

  it('aggiorna nome, tipo e settore', async () => {
    const { categorie, settori } = creaRepository();
    const casa = await settori.crea({ nome: 'Casa' });
    const lavoro = await settori.crea({ nome: 'Lavoro' });
    const creata = await categorie.crea({
      nome: 'Affitto',
      kind: 'uscita',
      settoreId: casa.id,
    });

    const aggiornata = await categorie.aggiorna(creata.id, {
      nome: 'Stipendio',
      kind: 'entrata',
      settoreId: lavoro.id,
    });

    expect(aggiornata).toEqual({
      id: creata.id,
      nome: 'Stipendio',
      kind: 'entrata',
      settoreId: lavoro.id,
    });
  });

  it('rifiuta l aggiornamento con un settore inesistente', async () => {
    const { categorie, settori } = creaRepository();
    const settore = await settori.crea({ nome: 'Casa' });
    const creata = await categorie.crea({
      nome: 'Affitto',
      kind: 'uscita',
      settoreId: settore.id,
    });

    await expect(
      categorie.aggiorna(creata.id, { settoreId: 'id-inesistente' }),
    ).rejects.toMatchObject({ codice: 'non_trovato' });
  });

  it('rifiuta l aggiornamento di una categoria inesistente', async () => {
    const { categorie } = creaRepository();

    await expect(
      categorie.aggiorna('id-inesistente', { nome: 'Affitto' }),
    ).rejects.toMatchObject({ codice: 'non_trovato' });
  });

  it('elimina una categoria con tombstone', async () => {
    const { categorie, settori } = creaRepository();
    const settore = await settori.crea({ nome: 'Casa' });
    const creata = await categorie.crea({
      nome: 'Affitto',
      kind: 'uscita',
      settoreId: settore.id,
    });

    await categorie.elimina(creata.id);

    const elenco = await categorie.elenca();
    const idTecnici = new Set([
      ID_CATEGORIA_TECNICA_INCASSO_CREDITI,
      ID_CATEGORIA_TECNICA_PAGAMENTO_DEBITI,
    ]);
    expect(elenco.filter((c) => !idTecnici.has(c.id))).toEqual([]);
    const riga = db
      ?.prepare('SELECT deleted_at FROM categories WHERE id = ?')
      .get(creata.id) as { deleted_at: string | null };
    expect(riga.deleted_at).not.toBeNull();
  });

  it('elimina anche il budget di default della categoria', async () => {
    const { categorie, settori, ctx } = creaRepository();
    const settore = await settori.crea({ nome: 'Casa' });
    const creata = await categorie.crea({
      nome: 'Affitto',
      kind: 'uscita',
      settoreId: settore.id,
    });
    await creaRepositorioBudgetDefault(ctx).imposta({
      categoriaId: creata.id,
      amountCents: 85000,
    });

    await categorie.elimina(creata.id);

    const riga = db
      ?.prepare('SELECT deleted_at FROM budget_defaults WHERE category_id = ?')
      .get(creata.id) as { deleted_at: string | null };
    expect(riga.deleted_at).not.toBeNull();
  });

  it('rifiuta l eliminazione di una categoria inesistente', async () => {
    const { categorie } = creaRepository();

    await expect(categorie.elimina('id-inesistente')).rejects.toMatchObject({
      codice: 'non_trovato',
    });
  });

  it('crea una categoria con un settore esistente tramite settoreId', async () => {
    const { ctx, settori } = creaRepository();
    const settore = await settori.crea({ nome: 'Casa' });

    const categoria = await creaCategoriaConSettoreEventuale(ctx, {
      nome: 'Affitto',
      kind: 'uscita',
      settoreId: settore.id,
    });

    expect(categoria.settoreId).toBe(settore.id);
  });

  it('crea settore e categoria con settoreNome', async () => {
    const { ctx } = creaRepository();

    const categoria = await creaCategoriaConSettoreEventuale(ctx, {
      nome: 'Stipendio',
      kind: 'entrata',
      settoreNome: 'Lavoro',
    });

    const settore = db
      ?.prepare('SELECT name FROM sectors WHERE id = ?')
      .get(categoria.settoreId) as { name: string };
    expect(settore.name).toBe('Lavoro');
  });

  it('annulla settore e categoria se il nuovo settore e duplicato', async () => {
    const { ctx, settori } = creaRepository();
    await settori.crea({ nome: 'Casa' });

    await expect(
      creaCategoriaConSettoreEventuale(ctx, {
        nome: 'Affitto',
        kind: 'uscita',
        settoreNome: 'Casa',
      }),
    ).rejects.toMatchObject({ codice: 'nome_duplicato' });

    expect(
      db
        ?.prepare('SELECT count(*) AS count FROM categories WHERE name = ?')
        .get('Affitto'),
    ).toEqual({ count: 0 });
    expect(
      db
        ?.prepare('SELECT count(*) AS count FROM sectors WHERE name = ?')
        .get('Casa'),
    ).toEqual({ count: 1 });
  });
});
