import { describe, expect, it } from 'vitest';

import {
  contoSchema,
  creaCategoriaSchema,
  creaContoSchema,
  creaMovimentoSchema,
  creaPosizioneSchema,
  creaSaldamentoSchema,
  creaSettoreSchema,
  creaTrasferimentoSchema,
  erroreApiSchema,
  filtriMovimentiSchema,
  posizioneSchema,
  settoreSchema,
} from './index.js';

describe('schemi dei contratti API', () => {
  it('valida gli errori API', () => {
    expect(
      erroreApiSchema.safeParse({
        ok: false,
        errore: { codice: 'ERRORE', messaggio: 'Messaggio' },
      }).success,
    ).toBe(true);
    expect(erroreApiSchema.safeParse({ ok: true }).success).toBe(false);
  });

  it('valida i conti', () => {
    expect(
      contoSchema.safeParse({
        id: 'conto-1',
        nome: 'Conto principale',
        saldoInizialeCents: 1000,
        dataApertura: '2026-01-15',
        archiviato: false,
      }).success,
    ).toBe(true);
    expect(creaContoSchema.safeParse({}).success).toBe(false);
  });

  it('valida i settori', () => {
    expect(
      settoreSchema.safeParse({ id: 'settore-1', nome: 'Casa' }).success,
    ).toBe(true);
    expect(creaSettoreSchema.safeParse({}).success).toBe(false);
  });

  it('richiede esattamente un settore per le categorie', () => {
    const datiBase = { nome: 'Spesa', kind: 'uscita' as const };

    expect(
      creaCategoriaSchema.safeParse({ ...datiBase, settoreId: 'settore-1' })
        .success,
    ).toBe(true);
    expect(
      creaCategoriaSchema.safeParse({
        ...datiBase,
        settoreId: 'settore-1',
        settoreNome: 'Casa',
      }).success,
    ).toBe(false);
    expect(creaCategoriaSchema.safeParse(datiBase).success).toBe(false);
  });

  it('rifiuta movimenti con importo zero', () => {
    const datiBase = {
      data: '2026-01-15',
      contoId: 'conto-1',
      categoriaId: 'categoria-1',
      descrizione: 'Caffè',
    };

    expect(
      creaMovimentoSchema.safeParse({ ...datiBase, amountCents: -100 }).success,
    ).toBe(true);
    expect(
      creaMovimentoSchema.safeParse({ ...datiBase, amountCents: 0 }).success,
    ).toBe(false);
  });

  it('applica i default ai filtri dei movimenti', () => {
    const risultato = filtriMovimentiSchema.safeParse({});

    expect(risultato.success).toBe(true);
    if (risultato.success) {
      expect(risultato.data.pagina).toBe(1);
      expect(risultato.data.perPagina).toBe(50);
    }
  });

  it('richiede conti diversi per i trasferimenti', () => {
    const datiBase = {
      data: '2026-01-15',
      amountCents: 1000,
      contoOrigineId: 'conto-1',
      descrizione: 'Giroconto',
    };

    expect(
      creaTrasferimentoSchema.safeParse({
        ...datiBase,
        contoDestinazioneId: 'conto-2',
      }).success,
    ).toBe(true);
    expect(
      creaTrasferimentoSchema.safeParse({
        ...datiBase,
        contoDestinazioneId: 'conto-1',
      }).success,
    ).toBe(false);
  });

  it('valida le posizioni e i saldamenti', () => {
    expect(
      creaPosizioneSchema.safeParse({
        descrizione: 'Prestito',
        verso: 'debito',
        importoCents: 1000,
      }).success,
    ).toBe(true);
    expect(
      creaPosizioneSchema.safeParse({
        descrizione: 'Prestito',
        verso: 'debito',
        importoCents: 0,
      }).success,
    ).toBe(false);
    expect(
      creaPosizioneSchema.safeParse({
        descrizione: 'Prestito',
        verso: 'debito',
        importoCents: -1000,
      }).success,
    ).toBe(false);
    expect(
      creaSaldamentoSchema.safeParse({
        contoId: 'conto-1',
        importoCents: 1000,
        data: '2026-01-15',
        operazioneId: '',
      }).success,
    ).toBe(false);
    expect(
      posizioneSchema.safeParse({
        id: 'posizione-1',
        descrizione: 'Prestito',
        verso: 'debito',
        importoInizialeCents: -1000,
        dataApertura: '2026-01-15',
        residuoCents: -1000,
      }).success,
    ).toBe(true);
  });
});
