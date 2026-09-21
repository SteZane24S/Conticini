import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';

import { ID_SETTORE_TECNICO_DEBITI_CREDITI } from '@conticini/dominio';

import { runMigrations } from '../migrations-runner.js';
import { creaRepositorioSettori } from './settori.js';

describe('creaRepositorioSettori', () => {
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
    dir = mkdtempSync(path.join(tmpdir(), 'conticini-settori-'));
    db = new Database(path.join(dir, 'conticini.db'));
    runMigrations(db);
    return creaRepositorioSettori({ db, deviceId: 'device-test' });
  }

  it('crea e ottiene un settore', async () => {
    const repo = creaRepository();

    const creato = await repo.crea({ nome: 'Casa' });

    expect(await repo.ottieni(creato.id)).toEqual(creato);
  });

  it('elenca i settori creati', async () => {
    const repo = creaRepository();
    const primo = await repo.crea({ nome: 'Casa' });
    const secondo = await repo.crea({ nome: 'Svago' });

    const elenco = await repo.elenca();
    expect(
      elenco.filter(
        (settore) => settore.id !== ID_SETTORE_TECNICO_DEBITI_CREDITI,
      ),
    ).toEqual([primo, secondo]);
  });

  it('rifiuta un nome gia usato da un settore attivo', async () => {
    const repo = creaRepository();
    await repo.crea({ nome: 'Casa' });

    await expect(repo.crea({ nome: 'Casa' })).rejects.toMatchObject({
      codice: 'nome_duplicato',
    });
  });

  it('aggiorna il nome', async () => {
    const repo = creaRepository();
    const creato = await repo.crea({ nome: 'Casa' });

    const aggiornato = await repo.aggiorna(creato.id, { nome: 'Abitazione' });

    expect(aggiornato).toEqual({ id: creato.id, nome: 'Abitazione' });
  });

  it('rifiuta l aggiornamento con un nome gia usato da un settore attivo', async () => {
    const repo = creaRepository();
    await repo.crea({ nome: 'Casa' });
    const secondo = await repo.crea({ nome: 'Svago' });

    await expect(
      repo.aggiorna(secondo.id, { nome: 'Casa' }),
    ).rejects.toMatchObject({ codice: 'nome_duplicato' });
  });

  it('rifiuta l aggiornamento di un settore inesistente', async () => {
    const repo = creaRepository();

    await expect(
      repo.aggiorna('id-inesistente', { nome: 'Abitazione' }),
    ).rejects.toThrow();
  });

  it('elimina un settore con tombstone', async () => {
    const repo = creaRepository();
    const creato = await repo.crea({ nome: 'Casa' });

    await repo.elimina(creato.id);

    const elenco = await repo.elenca();
    expect(
      elenco.filter(
        (settore) => settore.id !== ID_SETTORE_TECNICO_DEBITI_CREDITI,
      ),
    ).toEqual([]);
    expect(await repo.ottieni(creato.id)).toBeNull();
    const riga = db
      ?.prepare('SELECT deleted_at FROM sectors WHERE id = ?')
      .get(creato.id) as { deleted_at: string | null };
    expect(riga.deleted_at).not.toBeNull();
  });

  it('permette di riusare un nome dopo l eliminazione', async () => {
    const repo = creaRepository();
    const creato = await repo.crea({ nome: 'Casa' });

    await repo.elimina(creato.id);
    const ricreato = await repo.crea({ nome: 'Casa' });

    expect(ricreato).toEqual({ id: expect.any(String), nome: 'Casa' });
    expect(ricreato.id).not.toBe(creato.id);
  });

  it('rifiuta l eliminazione di un settore inesistente', async () => {
    const repo = creaRepository();

    await expect(repo.elimina('id-inesistente')).rejects.toThrow();
  });

  it('restituisce null per un settore inesistente', async () => {
    const repo = creaRepository();

    await expect(repo.ottieni('id-inesistente')).resolves.toBeNull();
  });
});
