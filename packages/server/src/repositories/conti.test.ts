import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';

import { runMigrations } from '../migrations-runner.js';
import { creaRepositorioConti } from './conti.js';

describe('creaRepositorioConti', () => {
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
    dir = mkdtempSync(path.join(tmpdir(), 'conticini-conti-'));
    db = new Database(path.join(dir, 'conticini.db'));
    runMigrations(db);
    return creaRepositorioConti({ db, deviceId: 'device-test' });
  }

  it('crea e ottiene un conto con tutti i campi mappati', async () => {
    const repo = creaRepository();

    const creato = await repo.crea({
      nome: 'Conto corrente',
      saldoInizialeCents: 12345,
      dataApertura: '2026-01-15',
      archiviato: false,
    });

    expect(await repo.ottieni(creato.id)).toEqual({
      id: creato.id,
      nome: 'Conto corrente',
      saldoInizialeCents: 12345,
      dataApertura: '2026-01-15',
      archiviato: false,
    });
  });

  it('elenca i conti creati', async () => {
    const repo = creaRepository();
    const primo = await repo.crea({
      nome: 'Banca',
      saldoInizialeCents: 0,
      dataApertura: '2026-01-01',
      archiviato: false,
    });
    const secondo = await repo.crea({
      nome: 'Carta',
      saldoInizialeCents: 5000,
      dataApertura: '2026-02-01',
      archiviato: false,
    });

    expect(await repo.elenca()).toEqual([
      {
        id: primo.id,
        nome: 'Banca',
        saldoInizialeCents: 0,
        dataApertura: '2026-01-01',
        archiviato: false,
      },
      {
        id: secondo.id,
        nome: 'Carta',
        saldoInizialeCents: 5000,
        dataApertura: '2026-02-01',
        archiviato: false,
      },
    ]);
  });

  it('aggiorna solo i campi indicati', async () => {
    const repo = creaRepository();
    const creato = await repo.crea({
      nome: 'Conto iniziale',
      saldoInizialeCents: 1000,
      dataApertura: '2026-01-01',
      archiviato: false,
    });

    const aggiornato = await repo.aggiorna(creato.id, {
      nome: 'Conto aggiornato',
      archiviato: true,
    });

    expect(aggiornato).toEqual({
      id: creato.id,
      nome: 'Conto aggiornato',
      saldoInizialeCents: 1000,
      dataApertura: '2026-01-01',
      archiviato: true,
    });
  });

  it('rifiuta l aggiornamento di un conto inesistente', async () => {
    const repo = creaRepository();

    await expect(
      repo.aggiorna('id-inesistente', { nome: 'Conto aggiornato' }),
    ).rejects.toMatchObject({ codice: 'non_trovato' });
  });

  it('archivia un conto', async () => {
    const repo = creaRepository();
    const creato = await repo.crea({
      nome: 'Conto da archiviare',
      saldoInizialeCents: 0,
      dataApertura: '2026-01-01',
      archiviato: false,
    });

    await repo.archivia(creato.id);

    expect(await repo.ottieni(creato.id)).toMatchObject({ archiviato: true });
  });

  it('rifiuta l archiviazione di un conto inesistente', async () => {
    const repo = creaRepository();

    await expect(repo.archivia('id-inesistente')).rejects.toMatchObject({
      codice: 'non_trovato',
    });
  });

  it('restituisce null per un conto inesistente', async () => {
    const repo = creaRepository();

    await expect(repo.ottieni('id-inesistente')).resolves.toBeNull();
  });
});
